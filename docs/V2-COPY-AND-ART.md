# Agency copy and illustration update

Updated on November 8, 2026 on the v2 staging branch.

Reviewed https://www.thefirebirdagency.com/ for the agency's service categories, independent-agency positioning, and office information. Revised homepage, agency, contact, specialty, coverage-guide, and application copy into direct professional language. Removed em dashes from source content and all 69 rendered pages. Existing saved application selections are normalized when restoring drafts where option punctuation has changed.

The homepage uses an ink-and-watercolor Sonoran Desert illustration in responsive WebP assets: public/images/sonoran-desert-sketch-{640,960,1280,1536}.webp. The original red agency logo is preserved.

Artwork was created with the built-in image-generation tool using the existing desert image as reference. Prompt: Transform the Sonoran Desert photograph into an elegant editorial ink-and-watercolor landscape, with recognizable branching saguaro cacti, layered Arizona mountains, desert shrubs, copper and terracotta washes, sage and blue-green ink on warm ivory textured paper. Full-bleed landscape composition with key subjects visible in a tall hero crop. No text, logos, or borders.

Validation: production build prerenders 69 routes; all 20 backend tests pass. Source and rendered HTML checked for em dashes. Desktop and phone artwork crop and page overflow checked in the browser. Changes are staging only; the live Fly deployment is unchanged.

The illustration is integrated as a full-width decorative hero background, with a warm paper overlay fading behind the text. The mobile treatment uses a quieter watermark so headings, body copy, and quote actions remain readable. The image is marked decorative for assistive technology. Desktop and 390-pixel mobile browser checks found no horizontal overflow.

## Official palette and compact layout

Matched the palette declared in https://www.thefirebirdagency.com/master.css: Firebird red #D52E32, navy #0B2242, secondary navy #0F2B55, and cool-white #F9FBFD. Shared buttons, headings, navigation, intake controls, icons, and backgrounds use this palette. Removed the decorative pseudo-element line before eyebrow headings.

Recolored the existing illustration with the built-in image tool. Prompt: Preserve the existing Sonoran Desert composition and fine ink/watercolor detail; replace copper, orange, brown, and green washes with delicate navy/slate-blue ink and restrained muted Firebird-red washes on pale cool-white paper. Keep the full landscape with no text, logo, or border. Responsive WebP assets remain in public/images/sonoran-desert-sketch-{640,960,1280,1536}.webp.

Reduced heading sizes, section spacing, header/logo dimensions, and hero padding. Desktop background art uses contain sizing to retain the full illustration. At the checked desktop width the hero measures 549 px high. Mobile homepage, business, contact, and plumbing application checks found no horizontal overflow or heading decoration. Build successfully prerendered all 69 public routes. No API changes or production deployment.

## Restrained use of red

At the owner's request, navy now carries actions, labels, icons, focus indicators, borders, and tinted surfaces. Red is retained in the original Firebird logo and subtle illustration details. Error messages retain their distinct error styling. The hero drawing uses reduced saturation and opacity to blend more quietly into the page. This changes the artwork's website presentation without modifying the source image.

Validation: production build prerendered 69 routes. Desktop and 390-pixel mobile browser checks confirmed navy buttons and labels, softer sketch presentation, and no horizontal overflow. No security behavior, API behavior, or live deployment was changed.

## Screenshot-confirmed copper color

The owner's supplied button screenshot identifies the intended accent as warm copper #A44520, rather than the official site's bright red. Buttons now use #A44520 with #813419 hover, and text accents use #94401F. Restored the original warm watercolor illustration under new cache-safe sonoran-desert-copper asset filenames. The background blend, compact layout, clean form border, and original logo remain in place. Build prerendered 69 routes and the live local response on port 3001 was checked for the correct copper color and new illustration URL.
