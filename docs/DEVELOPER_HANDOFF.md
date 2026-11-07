# Firebird website — conversation summary and developer handoff

Prepared November 6, 2026. This is a curated summary of the project decisions and implementation, rather than a verbatim chat transcript. Credentials, private return links, account identifiers, and personal filesystem paths are omitted.

## Project links and current status

- **Live website: https://firdbird-website.fly.dev/**
- **Public repository: https://github.com/Eagleston-Financial-Group/firdbird-website**
- Project and Fly app name: `firdbird-website` (keep this exact spelling).
- Main branch: `main`.
- Local project servers were stopped at the owner's request. Leave them stopped unless local development is requested.
- The deployed website remains running on Fly.io, with automatic stop/start when idle.

## Decisions from this chat

1. Build the Firebird Agency website using React, preserving the agreed page design, imagery, wording, navigation, and responsive behavior.
2. Implement working quote applications, drafts, document uploads, validation, and database persistence.
3. Keep the project in the owner's projects folder and the EFG GitHub organization. The repository was initially private and later made public at the owner's request.
4. Inspect published files and Git history for credentials before publication. No credentials were detected by the completed scans. Personal/internal metadata was removed from the published branch history; secret scanning and push protection were enabled.
5. Add the Firebird logo to the repository README and prominently display the live website link.
6. Deploy the frontend and API together on Fly.io, with separate development and production databases and server-only runtime secrets.
7. Use neutral Firebird website wording in project documentation and repository descriptions.
8. Commit and push each completed code or configuration change. Keep credentials and private links out of commits.
9. Remove temporary comparison files and synthetic verification records after testing.
10. Stop local development servers after deployment; keep the hosted app available.

## What is implemented

The site has 69 public page routes: a homepage, 37 informational pages, three application indexes, and 28 application pages. The application schemas contain 1,253 grouped field definitions. Private upload-token routes are additional dynamic routes.

Coverage includes contractor trades, medical and dental practices, multifamily properties and associations, business insurance, personal coverage, agency/team information, client services, contact details, and privacy information.

Applications provide four-step flows, conditional questions, browser and server validation, contact-only lead capture, private saved drafts, return links, upload-only links for another device, review screens, consent, and submission references.

Saving a form stores data in the application database. It does not automatically send email, notify staff, bind coverage, or send data to insurance companies. An authenticated staff dashboard and notification integration are not implemented.

## Architecture and source map

React and Vite build the frontend. Express serves the production bundle and same-origin API. PostgreSQL stores form data and document bytes. Fly.io runs a non-root Node.js container.

| Location | Purpose |
| --- | --- |
| `src/main.jsx` | Page dispatch, metadata, conditional intake styles |
| `src/pages/Home.jsx` | Homepage |
| `src/pages/InformationalPages.jsx` | Information, services, agency, and privacy pages |
| `src/pages/Applications.jsx` | Application indexes, form steps, drafts, uploads, review |
| `src/data/applications.js` | Shared application questions and conditional rules |
| `src/components/Layout.jsx` | Responsive header and footer |
| `src/styles.css`, `src/intake.css` | Shared and intake presentation |
| `src/metadata.js` | Titles, descriptions, canonical and structured metadata |
| `public/` | Logo, favicon, photography, team portraits |
| `server/app.mjs` | HTTP endpoints, validation middleware, rate limits |
| `server/db.mjs`, `server/drafts.mjs` | Database operations |
| `server/validation.mjs` | Server-side schema and attachment validation |
| `migrations/001_submissions.sql` | Idempotent database schema |
| `Dockerfile`, `.dockerignore`, `fly.toml` | Deployment and restricted build context |

Runtime dependencies include React 19, Express 5, pg 8, Multer 2, and dotenv. Vite 8 builds the frontend. Use the lockfile for exact dependency versions. The container uses Node.js 24; local setup requires Node.js 22.12 or newer.

## Local setup — only when requested

```powershell
git clone https://github.com/Eagleston-Financial-Group/firdbird-website.git
cd firdbird-website
npm ci
Copy-Item .env.example .env
# Configure development database values privately in .env.
npm run db:migrate
npm run dev
```

Development UI: `http://localhost:5173`. API: `http://127.0.0.1:3001`. Vite proxies `/api` to Express.

For the built site locally:

```powershell
npm run build
npm start
```

Open `http://localhost:3001`. Use Ctrl+C to stop foreground development processes. `npm run stop:local` stops the separately saved background server when its PID file exists; it is not a universal stop command for arbitrary processes.

## Environment and access

| Setting | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled runtime PostgreSQL connection |
| `DATABASE_URL_UNPOOLED` | Direct connection for migrations |
| `HOST` | Loopback locally; `0.0.0.0` on Fly |
| `PORT` | `3001` |
| `ALLOWED_ORIGINS` | Exact permitted browser origins |
| `NODE_ENV` | `production` in deployment |

Keep development credentials in ignored `.env`. Production credentials belong in Fly runtime secrets; a separately configured, ignored `.env.production.local` can be used for import. Obtain authorized credentials privately from the project owner. GitHub repository access does not grant deployment or database access. Fly currently uses the owner's personal organization.

Never add database credentials to frontend variables, Docker build arguments, source files, documentation, or logs. `.dockerignore` allows only required build inputs. No database credentials are needed to compile the frontend.

## Deploy to Fly.io

The existing app is `firdbird-website`, region `ord` (Chicago), with one shared CPU and 512 MB RAM. Internal port is 3001; HTTPS is enforced. The current configuration allows zero running machines while idle and starts the app on incoming requests.

After obtaining app access and signing in with the Fly CLI:

```powershell
# Only when production secrets need configuring or updating:
Get-Content .env.production.local |
  Where-Object { $_ -match '^DATABASE_URL(?:_UNPOOLED)?=' } |
  fly secrets import --stage -a firdbird-website

fly config validate --strict
fly deploy --remote-only --ha=false
fly status -a firdbird-website
fly checks list -a firdbird-website
Invoke-RestMethod https://firdbird-website.fly.dev/api/health
```

A local Docker installation is not required for remote builds. Fly runs `node server/migrate.mjs` before release; migration failure stops deployment. The API and built frontend are shipped together. File persistence is in PostgreSQL, so no Fly volume is required.

`/api/health` checks that the server responds. Its `databaseConfigured` field reports whether configuration exists, not whether a database connection succeeded. Verify database-backed behavior after changing credentials.

## Forms, storage, and API

Database tables: `form_submissions`, `submission_attachments`, `form_drafts`, `draft_attachments`, and `incomplete_leads`. Answers are JSON objects; attachments are private binary database values.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/submissions` | Validate and finalize an application |
| `POST /api/leads` | Save limited contact/progress data |
| `PATCH /api/leads/:leadToken` | Update limited contact data |
| `POST /api/drafts` | Create a private draft |
| `GET /api/drafts/:token` | Restore draft answers and attachment metadata |
| `PATCH /api/drafts/:token` | Save progress and optional attachments |
| `DELETE /api/drafts/:token/attachments/:attachmentId` | Remove a draft attachment |
| `POST /api/drafts/:token/upload-link` | Rotate the upload-only link |
| `GET /api/draft-uploads/:uploadToken` | Check upload-link availability |
| `POST /api/draft-uploads/:uploadToken` | Add files without viewing answers |

Submission JSON contains `formType`, `pagePath`, `fields`, and optional `draftToken` and `leadToken`. `formType` must match the shared schema's kind and slug; `pagePath` must match the application route. Consent and visible required fields are enforced on the server. Consult `server/README.md` for the complete contract.

Return and upload tokens are random 256-bit values stored as SHA-256 hashes. Links expire after 30 days. Finalization copies attachments atomically, locks the draft, and returns the same reference on repeated submission. Expired records are not automatically purged.

Upload limits are 10 files, 5 MB per file, and 20 MB total. The browser accepts PDF, Word, Excel, CSV, JPG, and PNG; the API also accepts WebP. Type/signature validation is implemented, but antivirus scanning is not. There is no public submission list or attachment download endpoint.

Rate limits are per process. Validated Fly client IPs identify visitors in the deployed environment; local operation ignores spoofed forwarding headers. Use shared rate-limit storage before scaling to multiple app instances. Add authentication before creating a staff dashboard.

## Verification completed

- Production build passed.
- All 13 backend tests passed after the latest runtime changes.
- Desktop and mobile page text/layout checks covered the public routes; the homepage was also checked at multiple tablet and desktop widths.
- All 28 application schemas were checked, including their 1,253 grouped field definitions and review text.
- Draft restoration, step navigation, conditional questions, consent, and final submission were exercised.
- Public HTTPS deployment checks covered assets, deep links, health, invalid-data rejection, origin rejection, saved drafts, document upload, and final submission with database verification.
- Synthetic records created by verification were removed. Temporary comparison and credential-audit files were removed.
- Local project servers were stopped. Do not restart them just to read this handoff.

## Working rules for the next coder

Preserve the existing visual design and wording unless the owner requests a change. Keep frontend and backend validation aligned through the shared application definitions. Read `AGENTS.md`, the root README, and `server/README.md` before editing.

Run `npm run build` after frontend changes and `npm run test:backend` after API changes. Database smoke scripts create synthetic data and clean up their own records; run them against development unless production verification is explicitly intended. Never send agency emails during tests.

Commit and push each completed code/configuration operation to the authorized branch. Review diffs for credentials and private links before pushing. Deployment is a separate operation from pushing Git commits; this repository currently uses the documented CLI deployment workflow.

Ask the owner for the next product requirement. Likely follow-up work, if requested, includes authenticated staff review, notification integration, scheduled retention cleanup, shared rate limits, or harmonizing browser/API upload formats.
