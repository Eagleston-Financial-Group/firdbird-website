// Build-time renderer used by scripts/prerender.mjs (through Vite's SSR loader).
import React from 'react';
import { renderToString } from 'react-dom/server';
import { App, publicRoutes, resolveRoute } from './App';
import { headHtml, pageHead } from './metadata';
import { landingPages } from './data/landing';

export { publicRoutes, landingPages };

export function renderRoute(pathname, origin) {
  const route = resolveRoute(pathname);
  const html = renderToString(<React.StrictMode><App pathname={pathname} /></React.StrictMode>);
  return { html, head: headHtml(pageHead({ ...route, origin })), route };
}
