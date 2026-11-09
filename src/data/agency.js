// Verified agency facts used across the site. Only add facts the agency can stand behind:
// no ratings, review counts, prices, or partnerships that aren't confirmed.
export const AGENCY = {
  name: 'The Firebird Agency',
  phone: '877-747-9020',
  phoneHref: 'tel:+18777479020',
  email: 'info@thefirebirdagency.com',
  emailHref: 'mailto:info@thefirebirdagency.com',
  serviceEmailHref: 'mailto:serviceteam@fbagency.net',
  offices: [
    { state: 'Arizona', city: 'Mesa', street: '1333 N Greenfield Road, Suite 103', locality: 'Mesa, AZ 85205', maps: 'https://www.google.com/maps/search/?api=1&query=1333+N+Greenfield+Road+Suite+103+Mesa+AZ+85205' },
    { state: 'California', city: 'Carlsbad', street: '2777 Jefferson Street, Suite 202', locality: 'Carlsbad, CA 92008', maps: 'https://www.google.com/maps/search/?api=1&query=2777+Jefferson+Street+Suite+202+Carlsbad+CA+92008' },
  ],
};

// Short trust statements for heroes. Sources: "independent agency" and "licensed all over the
// country" are the agency's own statements on thefirebirdagency.com; "60+" is conservative against
// the 72 partner insurers and specialty markets listed there (excluding the NCCI rating bureau).
export const trustPoints = ['Independent agency', '60+ insurance companies & markets', 'Licensed across the country'];

// Numbers for the count-up stats. Each must stay verifiable.
export const agencyStats = [
  { value: 60, suffix: '+', label: 'insurance companies and specialty markets' },
  { value: 2, suffix: '', label: 'offices in Mesa, AZ and Carlsbad, CA' },
];
