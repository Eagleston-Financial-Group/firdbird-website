# v2 brand and usability update

- Restored Firebird's deep blue-green (#092c37), copper (#a44520), and warm neutral palette across public pages and intake screens. The original red logo remains unchanged.
- Refined homepage imagery, card hierarchy, headings, quote panels, and client-service entry points.
- Rewrote homepage, shared coverage sections, and form messages in direct, conversational language. Quote requests are described as requests rather than instant prices.
- Corrected header and footer logo proportions and responsive sizes, checked at 320, 390, 768, and 1440 pixels.
- Added unique callback-form IDs, mobile-menu keyboard containment/Escape dismissal, outside-click and desktop-resize cleanup, safer fragment handling, visible reduced-motion content, and immediate hero text rendering.

Validation: production build prerendered all 69 public routes; all 20 backend tests passed. Browser audits of the homepage, business, contact, services, about, quote index, and plumbing application at 390 pixels found no horizontal overflow, duplicate IDs, or unlabelled controls. Mobile keyboard wrap and Escape behavior were verified. No production deployment was performed.

## Navy buttons with gold accents (November 8, 2026)

Replaced the copper accent with the site's Firebird navy, white, and red, plus restrained gold:
- Buttons: navy #0B2242 (hover #1D3D6B, with a thin gold underline). White text 15.9:1.
- Firebird red #BD2529 for eyebrow labels and the second line of headlines (6.1:1 on white). Error messages keep their separate red error styling.
- Gold #B8913A only for thin decorative details: header and footer top lines, section-heading underlines, card hover borders, the quote card's top edge, step-number rings, and the application progress line. Darker gold #9A7628 for small check marks (4.2:1). Light gold #D9BE7C for labels and checks on navy bands (9:1). Gold is never used for body text on white.
- Icons, link arrows, and focus rings use navy. Icon chips use a warm gold tint (#FAF6EC).

Colors are set in src/styles/tokens.css; the gold details are the final block of src/styles/refinements.css. Build prerendered all 69 routes; the local site on port 3001 was checked with no console errors. No production deployment.
