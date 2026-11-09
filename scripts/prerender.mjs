// Runs after `vite build`: prerenders every public route to dist/<route>/index.html (real HTML for
// fast first paint, crawlers, and link previews), keeps the empty client shell as dist/_shell.html
// for private upload links and unknown paths, and writes dist/routes.json for real 404s and the sitemap.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const dist = new URL('../dist/', import.meta.url);
const origin = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://firdbird-website.fly.dev').replace(/\/+$/, '');
const EMPTY_ROOT = '<div id="root"></div>';

const shellFile = new URL('_shell.html', dist);
const built = await readFile(new URL('index.html', dist), 'utf8');
// Re-running must start from the empty Vite shell, not from a page this script already rendered.
const shell = built.includes(EMPTY_ROOT) ? built : await readFile(shellFile, 'utf8');
if (!shell.includes(EMPTY_ROOT)) throw new Error('dist/index.html is not the Vite shell; run `vite build` first.');
await writeFile(shellFile, shell);

const vite = await createServer({ logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { renderRoute, publicRoutes, landingPages } = await vite.ssrLoadModule('/src/entry-server.jsx');
  const routes = publicRoutes();
  const unknown = Object.keys(landingPages).filter(path => !routes.includes(path));
  if (unknown.length) throw new Error(`src/data/landing.js lists routes that do not exist: ${unknown.join(', ')}`);
  for (const pathname of routes) {
    const { html, head } = renderRoute(pathname, origin);
    // Function replacements so "$" sequences in page text are never treated as patterns.
    const page = shell
      .replace(/<title>[\s\S]*?<\/title>\s*/, '')
      .replace(/<meta name="description"[^>]*>\s*/, '')
      .replace('</head>', () => `  ${head}\n  </head>`)
      .replace(EMPTY_ROOT, () => `<div id="root">${html}</div>`);
    const file = new URL(pathname === '/' ? 'index.html' : `${pathname.slice(1)}/index.html`, dist);
    await mkdir(dirname(fileURLToPath(file)), { recursive: true });
    await writeFile(file, page);
  }
  await writeFile(new URL('routes.json', dist), `${JSON.stringify(routes, null, 2)}\n`);
  console.log(`Prerendered ${routes.length} routes (canonical origin ${origin}).`);
} finally {
  await vite.close();
}
