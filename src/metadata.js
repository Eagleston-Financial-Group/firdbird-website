import { SITE } from './site.js';

const HOME_TITLE = 'Business, Contractor & Personal Insurance | Firebird Agency';
const HOME_DESCRIPTION = 'Independent insurance agency in Mesa, AZ and Carlsbad, CA. Compare business, contractor, trucking, home and auto coverage. Request a quote from Firebird.';

// Everything the document head needs for one route. Pure, so the build-time prerenderer
// (scripts/prerender.mjs) and the browser produce identical tags.
export function pageHead({ metadata, pathname, application, usesIntakeStyles, indexable = true, notFound = false, origin = SITE.url }) {
  const title = notFound ? 'Page not found | Firebird Agency'
    : metadata?.title || metadata?.documentTitle
      || (pathname === '/' ? HOME_TITLE : pathname.startsWith('/upload/') ? 'Upload your documents | Firebird Agency' : 'Insurance applications | Firebird Agency');
  const description = metadata?.metadataDescription || metadata?.description || HOME_DESCRIPTION;
  // Private upload links and unknown paths never appear in canonical URLs or search results.
  const url = indexable ? `${origin}${pathname === '/' ? '/' : pathname}` : `${origin}/`;
  const meta = [
    ['name', 'description', description],
    ['name', 'robots', indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'The Firebird Agency'],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', url],
    ['name', 'twitter:card', 'summary'],
    ...(usesIntakeStyles ? [] : [['name', 'twitter:title', title], ['name', 'twitter:description', description]]),
  ];
  const page = {
    '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description,
    isPartOf: { '@id': `${origin}/#website` }, about: { '@id': `${origin}/#agency` },
  };
  const jsonLd = usesIntakeStyles ? {
    '@context': 'https://schema.org', '@type': 'WebPage', name: title.replace(' | Firebird Agency', ''), description, url,
    about: page.about, isPartOf: page.isPartOf,
  } : {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'InsuranceAgency', '@id': `${origin}/#agency`, name: 'The Firebird Agency', url: `${origin}/`, logo: `${origin}/brand/logo.png`, telephone: '+1-877-747-9020', email: 'info@thefirebirdagency.com', address: [{ '@type': 'PostalAddress', streetAddress: '1333 N Greenfield Road, Suite 103', addressLocality: 'Mesa', addressRegion: 'AZ', postalCode: '85205', addressCountry: 'US' }, { '@type': 'PostalAddress', streetAddress: '2777 Jefferson Street, Suite 202', addressLocality: 'Carlsbad', addressRegion: 'CA', postalCode: '92008', addressCountry: 'US' }], areaServed: 'US', sameAs: ['https://www.linkedin.com/company/the-firebird-agency/', 'https://www.facebook.com/profile.php?id=100090705717235'] },
      { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: 'The Firebird Agency', publisher: { '@id': `${origin}/#agency` } }, page,
    ],
  };
  return { title, description, url, canonical: indexable ? url : null, meta, jsonLd };
}

const escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON inside <script> must not be able to close the tag.
const safeJson = value => JSON.stringify(value).replace(/</g, String.fromCharCode(92) + 'u003c');

// Static head markup for prerendered pages.
export function headHtml(head) {
  return [
    `<title>${escapeHtml(head.title)}</title>`,
    ...head.meta.map(([attribute, key, value]) => `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}" />`),
    head.canonical ? `<link rel="canonical" href="${escapeHtml(head.canonical)}" />` : '',
    `<script type="application/ld+json" data-head>${safeJson(head.jsonLd)}</script>`,
  ].filter(Boolean).join('\n    ');
}

// Updates the live document head, reusing tags the prerendered HTML already contains.
export function applyPageMetadata(route) {
  const head = pageHead(route);
  document.title = head.title;
  for (const [attribute, key, value] of head.meta) {
    let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
    if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element); }
    element.content = value;
  }
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (head.canonical) {
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = head.canonical;
  } else canonical?.remove();
  let script = document.head.querySelector('script[type="application/ld+json"][data-head]');
  if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.dataset.head = ''; document.head.appendChild(script); }
  script.textContent = JSON.stringify(head.jsonLd);
}
