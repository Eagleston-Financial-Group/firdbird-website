# Form storage

The Express server stores form submissions and attachments in the configured PostgreSQL database. Local development credentials stay in the ignored, server-only `.env`. Keep production credentials separately in the ignored `.env.production.local` and import only those database settings into Fly.io runtime secrets. Saving a form does not automatically send email or notify agency staff.

## Run

1. Install the project dependencies.
2. Copy `.env.example` to `.env` if credentials are not already configured, using pooled and direct connections for the development database.
3. Run `npm run db:migrate` with a direct PostgreSQL connection.
4. Run `npm run server`; the default listener is `http://127.0.0.1:3001`.

The server also serves `dist/` after the React production build. During development, proxy `/api` from Vite to port 3001. Configure `ALLOWED_ORIGINS` if the local UI port changes.

## Submission contract

`POST /api/submissions` accepts JSON `{ formType, pagePath, fields, draftToken?, leadToken? }` or equivalent multipart metadata with `fields` encoded as JSON, and attachments under any field name. `formType` is `${application.kind}-${application.slug}`; `pagePath` must match one of the 28 application schemas. `fields` contains flat strings, booleans, numbers, or arrays of those. An optional `_hp` honeypot must be empty. Final requests validate visible required fields, enumerated choices, date/email/phone types, numeric bounds, and consent against the shared application schema.

Success returns HTTP 201 and `{ ok: true, id, attachmentCount, message }`. Show the returned ID as the saved reference. The server returns an explicit error if storage fails; do not display success before the response arrives. Storage does not automatically send email, notify the agency, or bind insurance coverage.

Attachments: at most 10 files, 5 MB each and 20 MB combined. Accepted types: PDF, Word (`.doc`, `.docx`), Excel (`.xls`, `.xlsx`), CSV, JPG, PNG, and WebP. Attachments are stored as private binary data in PostgreSQL with the submission; they have no public download endpoint. Signature/type checks and size limits are applied; this is not antivirus scanning. No uploaded files are opened or executed.

Server controls include parameterized SQL, an atomic submission/attachment transaction, payload validation, allowed browser origins, and a per-process 10-request/15-minute IP limit. The app has no public submission listing API. Database access is limited to authorized database administrators and trusted server operators. Rate counters are held per process and reset on restart; use shared limit storage before scaling to multiple instances. Any future staff dashboard needs separate authentication.

## Callback requests and attribution

- `POST /api/callbacks`: JSON `{ name, phone, email?, topic, bestTime?, message?, consent: true, _hp?, attribution? }`. `topic` and `bestTime` must match `src/data/marketing.js`. Saved to `callback_requests`; returns `{ ok, id, message }`. Same origin checks and per-process 10-request/15-minute limit as submissions, in a separate bucket.
- Submissions, drafts, and leads accept an optional top-level `attribution` object (or a JSON string in multipart requests). Only the keys in `attributionKeys` are kept; landing page and referrer are reduced to origin and path; malformed values are dropped rather than rejected. Drafts and leads keep the first value they receive, and a final submission uses the draft's or lead's attribution before the one sent with the submission.
- Creating new drafts or leads (`POST /api/drafts`, `POST /api/leads`) is limited to 30 per client per 15 minutes, in addition to the general 300-request draft limit.
- `npm run db:migrate` runs every `migrations/NNN_*.sql` file in order; each is idempotent. `002_marketing.sql` adds the `attribution` columns and `callback_requests`.
- With a built site, the server returns 404 for paths not listed in `dist/routes.json`, serves `robots.txt` and `sitemap.xml` using `SITE_URL`, and marks `/upload/*` pages `noindex`.

## Private drafts and uploads

- `POST /api/leads`: saves only contact details, business/trade, contact preference, and progress; returns `leadToken`. `PATCH /api/leads/:leadToken` updates those fields. Partial email values are permitted during entry. No lead-reading endpoint exists.
- `POST /api/drafts`: creates a draft and returns `{ id, token, uploadToken, expiresAt }`.
- `GET /api/drafts/:token`: restores fields, attachment metadata, status, and `currentStep`.
- `PATCH /api/drafts/:token`: saves full fields and optional new attachments. Top-level `currentStep` (0–3) records progress; omitted progress preserves its previous value.
- `DELETE /api/drafts/:token/attachments/:attachmentId`: removes one attachment from that draft.
- `POST /api/drafts/:token/upload-link`: rotates an upload-only token.
- `GET /api/draft-uploads/:uploadToken`: returns only availability and expiration, never application fields.
- `POST /api/draft-uploads/:uploadToken`: accepts attachments only.

Return and upload tokens are 256-bit random values; only SHA-256 hashes are stored in the database. Links expire after 30 days. Return links grant access to the application, so keep them private. Upload links only allow uploads. Submitting with `draftToken` copies draft attachments in the same transaction, marks the draft submitted, prevents edits/uploads thereafter, and returns the same reference on repeated final submission. Each uploaded byte remains in the private database; files are never served publicly. Expiration disables access; it does not currently schedule a physical purge of expired records.

The default local server binds to loopback, so a phone cannot reach another computer's `localhost` links. The Fly.io configuration binds to `0.0.0.0:3001`, allows the deployed HTTPS origin, and creates return/upload links using that public origin. Those links can be opened on another device.

## Verify

- `npm run test:backend`: HTTP validation, persistence failure behavior, rate limits, and file handling against an injected test store.
- `node server/smoke.mjs`: end-to-end HTTP + PostgreSQL persistence check, then removes its synthetic submission and attachment.
- `node server/drafts-smoke.mjs`: tests lead capture, saved progress, scoped uploads, expiration, finalization, and repeat-submit protection against PostgreSQL, then removes all records created by that invocation.

Keep local `.env` connections pointed at the development database and Fly runtime secrets pointed at the production database. The deployment instructions import production settings from `.env.production.local`, leaving local development credentials unchanged. Fly releases run the idempotent migration using `DATABASE_URL_UNPOOLED`; normal API operations use `DATABASE_URL`. See the root README for deployment commands. Do not commit either environment file or copy database credentials into frontend code.
