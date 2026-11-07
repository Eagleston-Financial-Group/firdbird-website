# Automatic application drafts

Both site versions share the same cookie-based draft API and save coordinator. Each of the 28 application types has its own draft cookie. Browser cookies store only a random 256-bit capability; answers are stored in PostgreSQL. Production cookies are host-only, Secure, HttpOnly, SameSite=Lax, and expire after 30 days of inactivity. Only SHA-256 capability hashes are stored in the database.

## Behavior

- The first entered answer creates a draft automatically. Partial emails and other incomplete values are allowed while drafting. Final submission still enforces the complete application schema and fresh consent.
- Saves run after a 650 ms pause, after field blur, or at most 2 seconds into continuous typing. Pending saves are serialized, retried on failure and when online, and flushed when the page becomes hidden. Leaving with outstanding changes prompts the browser to warn the visitor.
- Return visits restore the latest answers, attachments, and step from the database using the application cookie. No application answers or access tokens are put in localStorage.
- A private return link can be requested for another device. Existing return links remain supported and associate that draft with the current browser. Legacy drafts cannot be automatically discovered without a previous cookie or their private link.
- Progress uses valid visible required fields, is calculated by shared schema code on the server, and is persisted as completion_percent plus required/answered counts and a definition version. Drafts stop at 99%; submitted applications are 100%. Optional answers still save. Existing records receive an additive progress backfill without changing their answers or save timestamps.
- Revision checks reject stale saves and submissions with HTTP 409. The visitor must explicitly load the latest draft rather than silently overwriting another tab.
- Forgetting a draft removes only that application's browser cookie. Records are retained. No staff listing or personal-data export API was added.

## API and controls

`POST /api/application-drafts/open` initializes a cookie or restores its draft. `PUT /api/application-drafts` saves fields and step with the previous revision. Additional cookie-authorized routes handle private return links, uploads, final submission, and forgetting. All writes require an allowed Origin and reject cross-site fetches. JSON requests have a 110 KB limit; draft values are restricted to known schema keys. Cookies and draft responses are private/no-store. Upload limits and byte-signature checks remain in place. HTTPS is required in production. Request bodies, database URLs, cookies, and return links must never be logged.

Migration 003 is additive. Migrations run in numeric order; progress backfill is versioned. Tests cover every application schema, interrupted writes, cross-origin attempts, cookie isolation, restore, revision conflicts, and idempotent submission. Real-database integration tests require RUN_DRAFT_DB_TESTS=1 and DRAFT_TEST_HOST set to the isolated test endpoint; they must not run against production. No automatic email is sent.

Without sign-in, possession of the browser cookie or private return link grants access. This is intended for a person's own device; shared devices should use the forget action. Expiration disables access but does not currently purge retained records. Multi-machine deployments need a shared rate-limit store; the current deployment uses one Fly app machine with automatic stop/start.
