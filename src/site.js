// Public site settings. Tag IDs are public identifiers, not credentials; leave them unset to keep tracking off.
const env = import.meta.env;

export const SITE = {
  url: (env.VITE_SITE_URL || (typeof window === 'undefined' ? '' : window.location.origin)).replace(/\/+$/, ''),
  phone: '877-747-9020',
  phoneHref: 'tel:+18777479020',
  tags: {
    ga4Id: env.VITE_GA4_ID || '',
    adsId: env.VITE_GOOGLE_ADS_ID || '',
    adsLeadLabel: env.VITE_GOOGLE_ADS_LEAD_LABEL || '',
    adsCallLabel: env.VITE_GOOGLE_ADS_CALL_LABEL || '',
    metaPixelId: env.VITE_META_PIXEL_ID || '',
  },
};

// Producer license numbers shown in the footer. Fill in with the agency's real AZ and CA numbers;
// California requires the license number on advertising. Nothing renders while this is empty.
export const LICENSES = [
  // { state: 'AZ', label: 'Arizona license', number: '' },
  // { state: 'CA', label: 'California license', number: '' },
];
