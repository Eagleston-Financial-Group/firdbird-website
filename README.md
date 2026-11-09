<img src="public/brand/logo.png" alt="The Firebird Agency" width="260" />

# firdbird-website

> [!TIP]
> **Live website: [Open Firebird Agency ↗](https://firdbird-website.fly.dev/)**

[Developer handoff and project conversation summary](docs/DEVELOPER_HANDOFF.md)

The Firebird Agency website, built with React and Express, includes insurance information, quote applications, saved drafts, and document uploads.

The React frontend and Express API can run locally or together on Fly.io. Form records and attachments are stored in PostgreSQL; database credentials are used only by the Node server.

## Run locally

Requires Node.js 22.12 or newer and npm. The Fly.io container uses Node.js 24.

```powershell
cd path/to/firdbird-website
npm install
npm run dev
```

Open **http://localhost:5173**. Vite serves React and proxies `/api` to the local Express server on port 3001. Both servers bind to this computer by default.

The existing local `.env` contains the development database configuration. It is ignored by Git and must never be committed. On first setup, copy `.env.example` to `.env` and configure the pooled and direct connection strings for your development database, then run `npm run db:migrate`. Keep this local `.env` pointed at development.

## Build and run the production bundle locally

```powershell
npm run build
npm start
```

Open **http://localhost:3001**. The Express server serves the built React app, deep links, and the API together. This does not publish the website.

## Deploy to Fly.io

The deployment target is `firdbird-website`, with the site and API served together at `https://firdbird-website.fly.dev`. `fly.toml` uses the Chicago region, one shared CPU, and 512 MB of memory. Machines stop when idle and start when requests arrive. Local development continues to use the loopback defaults above.

1. Install the [Fly CLI](https://fly.io/docs/flyctl/install/) and sign in with `fly auth login`. The app must exist in an organization you can deploy to. For a different app name, update both `app` and `ALLOWED_ORIGINS` in `fly.toml`.
2. Create a separate, ignored `.env.production.local` containing `DATABASE_URL` with the pooled connection and `DATABASE_URL_UNPOOLED` with the direct connection for your production database. Keep the existing local `.env` configured for development; do not use its credentials for the deployment. Database connections verify the server's TLS certificate. Send these two settings to Fly as runtime secrets; do not add them to `fly.toml`, Docker build arguments, or frontend variables.
3. Build and deploy with Fly's remote builder. A local Docker installation is not required.

From PowerShell, the following imports only the two production database settings from `.env.production.local`, without displaying their values or sending local development host/origin settings. Both environment files are ignored by Git and excluded from the Docker build context:

```powershell
Get-Content .env.production.local |
  Where-Object { $_ -match '^DATABASE_URL(?:_UNPOOLED)?=' } |
  fly secrets import --stage -a firdbird-website
fly deploy --remote-only --ha=false
fly status -a firdbird-website
fly checks list -a firdbird-website
Invoke-RestMethod https://firdbird-website.fly.dev/api/health
```

The Docker build installs locked dependencies and compiles React. The final container runs as the unprivileged `node` user and includes only production dependencies, the built site, API modules, shared application definitions, and migrations. `.dockerignore` restricts the remote build context to required source files; local credentials, Git history, test artifacts, and database exports are excluded.

Before each release, Fly runs `node server/migrate.mjs` using the direct database secret. A migration failure stops the deployment. Form records and uploaded files remain in PostgreSQL, so no Fly volume is needed. The HTTP check at `/api/health` verifies that the server responds; `databaseConfigured` reports configuration presence, not a database connection test. Verify a synthetic form workflow after changing the database configuration.

See the [Fly configuration reference](https://fly.io/docs/reference/configuration/) and [runtime secrets documentation](https://fly.io/docs/apps/secrets/) for deployment operations.

## Design system and page structure

- **Styles** live in `src/styles/`: `tokens.css` (navy/white/gray palette with one teal accent, type scale, radii, shadows, motion timing), `base.css`, `components.css` (buttons, cards, icon chips, page hero, quote card, forms, FAQ accordion, steps, stats), and page files `layout.css`, `home.css`, `pages.css`, `intake.css`. Primary buttons use `--cta`; set it to `var(--ember-600)` in `tokens.css` to match the logo's ember instead of teal.
- **Shared components** are in `src/components/ui.jsx` (`PageHero`, `QuoteCard`, `CallLink`, `TrustList`, `StatGrid`, …) and `src/components/Icon.jsx` (lucide icons).
- **Ad landing pages:** `src/data/landing.js` maps each product page to its contact topic and matching application. Those pages show the short quote card in the hero; the header and phone "Get a quote" buttons jump to it.
- **Verified facts only:** trust points and count-up numbers come from `src/data/agency.js`; testimonials render only when `src/data/reviews.js` has genuine reviews.
- **Motion** (`src/motion.js`): scroll reveal, count-up, and the phone action bar. All animation respects `prefers-reduced-motion`.
- **Prerendering:** `npm run build` runs `vite build` and then `scripts/prerender.mjs`, which writes real HTML for every public route (`dist/<route>/index.html`), keeps `dist/_shell.html` for private upload links and unknown paths, and writes `dist/routes.json`. The browser hydrates the prerendered page. Components must not read `window`/`document` during render.

## Advertising and conversion tracking

The site is set up to work as a Google Ads and Meta Ads landing page:

- **Ad-click attribution.** `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, and `utm_*` values from the landing URL are kept in the browser for 90 days (first touch, replaced by a newer ad click) and stored in an `attribution` column with leads, drafts, submissions, and callback requests. Query strings are stripped from the stored landing page and referrer.
- **Tags.** The Google tag (GA4 and/or Google Ads) and Meta Pixel load only when their public IDs are set: `VITE_GA4_ID`, `VITE_GOOGLE_ADS_ID`, `VITE_GOOGLE_ADS_LEAD_LABEL`, `VITE_GOOGLE_ADS_CALL_LABEL`, `VITE_META_PIXEL_ID`. These are compiled into the browser bundle, so set them in a local `.env` for testing and in `fly.toml` `[build.args]` for deployment. They are public identifiers, never credentials.
- **Events.** `generate_lead` (plus the Google Ads lead conversion and Meta `Lead`) fires when an application or callback request is saved; the reference ID is sent as `transaction_id`/`eventID` for de-duplication. Email and phone are passed to the Google tag for enhanced conversions, which Google hashes. Also tracked: `begin_application`, `callback_form_start`, `phone_call_click` (and the Ads call conversion), `email_click`, and `quote_cta_click`, with a `link_location` such as `hero`, `header`, or `mobile-bar`.
- **Privacy.** Consent Mode defaults allow measurement. Advertising storage and sharing are denied when the browser sends Global Privacy Control or the visitor opts out under **Your privacy choices** on `/privacy`. The Meta Pixel does not load for opted-out visitors.
- **Landing-page experience.** A sticky call/quote bar on phones, a short callback form on `/contact`, real 404 responses, `robots.txt`, `sitemap.xml` (built from `dist/routes.json`), fixed canonical URLs (`VITE_SITE_URL`/`SITE_URL`), `noindex` on private upload links, long-lived caching for fingerprinted assets, and HSTS in production.
- **License numbers.** Add the agency's AZ and CA producer license numbers to `LICENSES` in `src/site.js` to show them in the footer. California requires the license number on advertising.

## Project structure

- `src/pages/Home.jsx` — homepage.
- `src/pages/InformationalPages.jsx` — insurance, industry, team, and agency pages.
- `src/pages/Applications.jsx` — quote selection and React application flows.
- `src/data/applications.js` — application questions and conditional fields.
- `src/components/Layout.jsx` — shared responsive navigation and footer.
- `public/` — logo, photography, and team portraits.
- `server/` — validated submission, draft, and attachment APIs.
- `migrations/` — versioned database schema.

## Validation

```powershell
npm run build
npm run test:backend
```

See `server/README.md` for the API and database details. Forms save to the application database. Saving a form does not automatically send email or notify agency staff. Telephone, email, LinkedIn, and carrier links open their listed destinations.

## Codex

Open this repository folder as a project in Codex to continue working on it.
