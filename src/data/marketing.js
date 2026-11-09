// Shared by the browser and the API so both validate the same marketing fields.

// Ad-click and campaign parameters kept with leads so staff can see which ad produced a request
// and, if they choose, upload offline conversions to Google Ads or Meta.
export const clickIdKeys = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid'];
export const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'];
export const attributionKeys = [...clickIdKeys, ...campaignKeys, 'landingPage', 'referrer', 'firstSeenAt'];

export const contactTopics = [
  'Business insurance',
  'Contractor insurance',
  'Trucking insurance',
  'Home and auto insurance',
  'Other personal insurance',
  'Multifamily / association insurance',
  'Dental / medical practice insurance',
  'Other insurance',
];

export const callbackTimes = ['Any time', 'Morning', 'Afternoon', 'Evening'];

export const callbackLimits = { name: 100, email: 200, phone: 30, message: 1000 };
