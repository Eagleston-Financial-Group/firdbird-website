// Ad landing pages: which product each page sells, the matching contact topic for the short quote
// form, and the detailed application (when one exists). Keep product names to lines the agency
// actually writes; scripts/prerender.mjs fails the build if a key is not a real route.

export const QUICK_QUOTE_ID = 'quick-quote';

const business = (product, icon) => ({ product, icon, topic: 'Business insurance', applicationPath: null });
const personal = (product, icon, applicationPath, topic = 'Other personal insurance') => ({ product, icon, topic, applicationPath });
const trucking = product => ({ product, icon: 'trucking', topic: 'Trucking insurance', applicationPath: null });

export const landingPages = {
  // Hubs
  '/business': business('Business insurance', 'business'),
  '/personal': { product: 'Home, auto & personal insurance', icon: 'home', topic: 'Home and auto insurance', applicationPath: '/quote/personal', applicationLabel: 'Choose a personal application' },
  '/trucking': trucking('Trucking insurance'),
  '/medical-offices': { product: 'Dental & medical office insurance', icon: 'medical', topic: 'Dental / medical practice insurance', applicationPath: '/quote/medical/small-medical', applicationLabel: 'Start the medical office application' },
  '/multifamily': { product: 'Apartment, condo & HOA insurance', icon: 'multifamily', topic: 'Multifamily / association insurance', applicationPath: null },

  // Trucking operations
  '/trucking/owner-operators': trucking('Owner-operator trucking insurance'),
  '/trucking/fleets': trucking('Trucking fleet insurance'),
  '/trucking/new-authority': trucking('New authority trucking insurance'),
  '/trucking/cargo': trucking('Motor truck cargo insurance'),

  // Practices and properties with tailored applications
  '/medical-offices/dental-practices': { product: 'Dental practice insurance', icon: 'dental', topic: 'Dental / medical practice insurance', applicationPath: '/quote/medical/dental' },
  '/multifamily/apartments': { product: 'Apartment building insurance', icon: 'multifamily', topic: 'Multifamily / association insurance', applicationPath: '/quote/multifamily/apartments' },
  '/multifamily/condo-associations': { product: 'Condo association insurance', icon: 'building', topic: 'Multifamily / association insurance', applicationPath: '/quote/multifamily/condo-associations' },
  '/multifamily/hoas': { product: 'HOA insurance', icon: 'association', topic: 'Multifamily / association insurance', applicationPath: '/quote/multifamily/hoas' },

  // Business coverage guides
  '/insurance/business-liability': business('General liability insurance', 'liability'),
  '/insurance/commercial-property': business('Commercial property insurance', 'property'),
  '/insurance/professional-liability': business('Professional liability & malpractice insurance', 'professional'),
  '/insurance/community-associations': { product: 'HOA & condo association insurance', icon: 'association', topic: 'Multifamily / association insurance', applicationPath: null },
  '/insurance/employment-practices': business('Employment practices liability insurance', 'employment'),
  '/insurance/cyber-data-breach': business('Cyber & data breach insurance', 'cyber'),
  '/insurance/crime': business('Business crime insurance', 'crime'),
  '/insurance/workers-compensation': business('Workers’ compensation insurance', 'workers-comp'),
  '/insurance/commercial-auto': business('Commercial auto insurance', 'commercial-auto'),
  '/insurance/business-umbrella': business('Commercial umbrella & excess insurance', 'umbrella'),

  // Personal coverage guides
  '/insurance/home-auto': personal('Home & auto insurance', 'home', '/quote/personal/home-auto', 'Home and auto insurance'),
  '/insurance/personal-umbrella': personal('Personal umbrella insurance', 'umbrella', '/quote/personal/umbrella'),
  '/insurance/flood': personal('Flood insurance', 'flood', '/quote/personal/flood'),
  '/insurance/motorcycle': personal('Motorcycle insurance', 'motorcycle', '/quote/personal/motorcycle'),
  '/insurance/boat-watercraft': personal('Boat & watercraft insurance', 'boat', '/quote/personal/boat'),
  '/insurance/mexico-auto': personal('Mexico auto insurance', 'mexico-auto', '/quote/personal/mexico-auto'),
};

export function landingFor(pathname) {
  return landingPages[pathname] ?? null;
}

// Pages that render the short quote card (QuoteCard, id="quick-quote").
const quickQuotePages = new Set(['/', '/contact', ...Object.keys(landingPages)]);

// Where "Get a quote" in the header and phone action bar should go on a given page, so the
// action always matches the product the visitor arrived for.
export function quoteHrefFor(pathname) {
  if (quickQuotePages.has(pathname)) return `#${QUICK_QUOTE_ID}`;
  if (pathname === '/quote') return '#quote-options';
  return '/quote';
}

export function applicationLabelFor(entry) {
  if (!entry?.applicationPath) return '';
  return entry.applicationLabel || `Start the full ${entry.product.replace(/ insurance$/i, '').toLowerCase()} application`;
}
