const HOME_TITLE = 'Business, Contractor & Personal Insurance | Firebird Agency';
const HOME_DESCRIPTION = 'Independent insurance agency in Mesa, AZ and Carlsbad, CA. Compare business, contractor, trucking, home and auto coverage. Request a quote from Firebird.';

export function applyPageMetadata(metadata, pathname, application, usesIntakeStyles) {
  const title = metadata?.title || metadata?.documentTitle || (pathname === '/' ? HOME_TITLE : 'Insurance applications | Firebird Agency');
  const description = metadata?.metadataDescription || metadata?.description || HOME_DESCRIPTION;
  const url = new URL(pathname, window.location.origin).href;
  const origin = window.location.origin;
  document.title = title;
  function meta(key, value, property = false) {
    const attribute = property ? 'property' : 'name';
    let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
    if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element); }
    element.content = value;
  }
  meta('description', description);
  meta('robots', 'index, follow, max-image-preview:large');
  meta('og:type', 'website', true);
  meta('og:site_name', 'The Firebird Agency', true);
  meta('og:title', title, true);
  meta('og:description', description, true);
  meta('og:url', url, true);
  meta('twitter:card', 'summary');
  if (!usesIntakeStyles) meta('twitter:title', title);
  if (!usesIntakeStyles) meta('twitter:description', description);
  const canonical = document.createElement('link');
  canonical.rel = 'canonical'; canonical.href = url; document.head.appendChild(canonical);
  const page = {
    '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description,
    isPartOf: { '@id': `${origin}/#website` }, about: { '@id': `${origin}/#agency` },
  };
  const structuredData = usesIntakeStyles ? {
    '@context': 'https://schema.org', '@type': 'WebPage', name: title.replace(' | Firebird Agency', ''), description, url,
    about: page.about, isPartOf: page.isPartOf,
  } : {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'InsuranceAgency', '@id': `${origin}/#agency`, name: 'The Firebird Agency', url: `${origin}/`, logo: `${origin}/brand/logo.png`, telephone: '+1-877-747-9020', email: 'info@thefirebirdagency.com', address: { '@type': 'PostalAddress', streetAddress: '1333 N Greenfield Road, Suite 103', addressLocality: 'Mesa', addressRegion: 'AZ', postalCode: '85205', addressCountry: 'US' }, sameAs: ['https://www.linkedin.com/company/the-firebird-agency/'] },
      { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: 'The Firebird Agency', publisher: { '@id': `${origin}/#agency` } }, page,
    ],
  };
  const jsonLd = document.createElement('script');
  jsonLd.type = 'application/ld+json'; jsonLd.textContent = JSON.stringify(structuredData); document.head.appendChild(jsonLd);
}
