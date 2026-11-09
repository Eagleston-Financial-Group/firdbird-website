// Ad-click attribution, Google tag (GA4 + Google Ads), and Meta Pixel.
// Tags load only when their IDs are configured in src/site.js (via VITE_* settings).
import { SITE } from './site.js';
import { campaignKeys, clickIdKeys } from './data/marketing.js';

const ATTRIBUTION_KEY = 'firebird.attribution';
const OPT_OUT_KEY = 'firebird.adOptOut';
const ATTRIBUTION_DAYS = 90; // Google click IDs stay valid for offline conversion upload for 90 days.

const storage = {
  get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { window.localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  remove(key) { try { window.localStorage.removeItem(key); } catch { /* storage unavailable */ } },
};

const pathOnly = value => {
  try { const url = new URL(value); return `${url.origin}${url.pathname}`; } catch { return ''; }
};

// Keeps the first touch for 90 days; a new ad click or campaign link replaces it.
export function captureAttribution(location = window.location, referrer = document.referrer) {
  const params = new URLSearchParams(location.search);
  const incoming = {};
  for (const key of [...clickIdKeys, ...campaignKeys]) {
    const value = params.get(key);
    if (value) incoming[key] = value.slice(0, 300);
  }
  let stored = null;
  try { stored = JSON.parse(storage.get(ATTRIBUTION_KEY) || 'null'); } catch { stored = null; }
  if (stored && !(Date.parse(stored.firstSeenAt) > Date.now() - ATTRIBUTION_DAYS * 864e5)) stored = null;
  if (Object.keys(incoming).length || !stored) {
    const external = referrer && !referrer.startsWith(location.origin) ? pathOnly(referrer) : '';
    stored = { ...incoming, landingPage: location.pathname, ...(external ? { referrer: external } : {}), firstSeenAt: new Date().toISOString() };
    storage.set(ATTRIBUTION_KEY, JSON.stringify(stored));
  }
  return stored;
}

export function getAttribution() {
  try { return JSON.parse(storage.get(ATTRIBUTION_KEY) || 'null') || undefined; } catch { return undefined; }
}

// "Do not sell or share": honored from the browser's Global Privacy Control signal or the privacy page choice.
export function adsOptedOut() {
  return storage.get(OPT_OUT_KEY) === '1' || navigator.globalPrivacyControl === true;
}
export function globalPrivacyControl() { return navigator.globalPrivacyControl === true; }
export function setAdsOptOut(optOut) {
  if (optOut) storage.set(OPT_OUT_KEY, '1'); else storage.remove(OPT_OUT_KEY);
  const state = optOut || globalPrivacyControl() ? 'denied' : 'granted';
  window.gtag?.('consent', 'update', { ad_storage: state, ad_user_data: state, ad_personalization: state });
}

function loadScript(src) {
  const script = document.createElement('script');
  script.async = true; script.src = src;
  document.head.appendChild(script);
}

function e164(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return undefined;
}

export function trackEvent(name, params = {}) {
  window.gtag?.('event', name, params);
}

function adsConversion(label, params = {}) {
  const { adsId } = SITE.tags;
  if (adsId && label) window.gtag?.('event', 'conversion', { send_to: `${adsId}/${label}`, ...params });
}

// A completed quote application or callback request.
export function trackLead({ id, type, email, phone }) {
  if (!adsOptedOut() && (email || phone)) {
    // Google hashes these before sending (enhanced conversions for leads).
    window.gtag?.('set', 'user_data', { ...(email ? { email } : {}), ...(e164(phone) ? { phone_number: e164(phone) } : {}) });
  }
  trackEvent('generate_lead', { lead_type: type, ...(id ? { transaction_id: id } : {}) });
  adsConversion(SITE.tags.adsLeadLabel, id ? { transaction_id: id } : {});
  if (!adsOptedOut()) window.fbq?.('track', 'Lead', { content_name: type }, id ? { eventID: id } : undefined);
}

function onClick(event) {
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!link) return;
  const href = link.getAttribute('href') || '';
  const placement = link.dataset.track || link.closest('[data-track-area]')?.dataset.trackArea || 'page';
  if (href.startsWith('tel:')) {
    trackEvent('phone_call_click', { link_location: placement });
    adsConversion(SITE.tags.adsCallLabel);
    if (!adsOptedOut()) window.fbq?.('track', 'Contact', { content_name: 'phone' });
  } else if (href.startsWith('mailto:')) {
    trackEvent('email_click', { link_location: placement });
  } else if (/^\/(quote|contractors|contact)(\/|$|\?|#)/.test(href) || href === '#quick-quote' || href === '#quote-options') {
    trackEvent('quote_cta_click', { link_location: placement, link_url: href });
  }
}

let started = false;
export function initTracking() {
  if (started) return;
  started = true;
  captureAttribution();
  document.addEventListener('click', onClick, true);
  const { ga4Id, adsId, metaPixelId } = SITE.tags;
  const optedOut = adsOptedOut();
  if (ga4Id || adsId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    const adState = optedOut ? 'denied' : 'granted';
    window.gtag('consent', 'default', { ad_storage: adState, ad_user_data: adState, ad_personalization: adState, analytics_storage: 'granted' });
    window.gtag('js', new Date());
    if (ga4Id) window.gtag('config', ga4Id);
    if (adsId) window.gtag('config', adsId);
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id || adsId)}`);
  }
  if (metaPixelId && !optedOut) {
    const fbq = function fbq() { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
    fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
    window.fbq = window._fbq = fbq;
    loadScript('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', metaPixelId);
    window.fbq('track', 'PageView');
  }
}
