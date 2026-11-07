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
