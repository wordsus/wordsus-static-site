# Wordsus API

REST API for cross-device synchronization of Wordsus user data (reading progress, favorites, recent books, preferences).

Built on **Cloudflare Workers** + **Hono** + **D1 (edge SQLite)**. Authentication uses **Supabase Auth** JWT verification only — the API never manages credentials directly.

> The backend is optional. The frontend works fully in local-only mode without it.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| Framework | Hono |
| Database | Cloudflare D1 (SQLite) |
| Auth | Supabase Auth (JWT verification) |
| Schema migrations | Wrangler D1 migrations |

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts                  # App entry — CORS, routes, error handling
│   ├── middleware/
│   │   ├── auth.ts               # JWT middleware (ES256/HS256 auto-detection)
│   │   └── error.ts              # Global error handler
│   ├── routes/
│   │   ├── reading.ts            # GET/PUT/DELETE /reading
│   │   ├── favorites.ts          # GET/POST/DELETE /favorites
│   │   ├── recent.ts             # GET/PUT/DELETE /recent
│   │   ├── preferences.ts        # GET/PUT /preferences
│   │   └── sync.ts               # GET/POST /sync (pull/push)
│   ├── db/
│   │   └── queries.ts            # D1 query helpers (all prepared statements)
│   ├── utils/
│   │   ├── timestamps.ts         # ISO 8601 helpers
│   │   └── validation.ts         # Request body validators
│   └── types/
│       └── index.ts              # Shared TypeScript types
├── migrations/
│   └── 0001_initial-schema.sql   # Initial tables and indexes
├── .dev.vars.example             # Template for local secrets
├── wrangler.toml                 # Workers and D1 configuration
├── package.json
└── tsconfig.json
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) (or npm/yarn)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — installed as a dev dependency
- A [Cloudflare account](https://dash.cloudflare.com/)
- A [Supabase project](https://supabase.com/) for authentication

---

## Local Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure local secrets

Copy the example file and fill in your values:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co

# For HS256 projects (older Supabase):
# Found in Supabase Dashboard → Settings → API → JWT Secret
SUPABASE_JWT_SECRET=<your-jwt-secret>

# For ES256 projects (newer Supabase, recommended):
# The JWKS URL is always: https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWKS_URL=https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
```

> You only need to set the variable(s) matching your Supabase project's JWT algorithm.
> The middleware reads the `alg` header from incoming tokens and picks the right verification path automatically.

### 3. Create the local D1 database and apply migrations

```bash
# Create the local D1 database (first time only)
pnpm wrangler d1 create wordsus-prod

# Apply all pending migrations to the local database
pnpm migrate:local
```

> After this step, copy the `database_id` printed by the create command and paste it into `wrangler.toml` under `[[d1_databases]]`.

### 4. Start the dev server

```bash
pnpm dev
```

The API is available at `http://localhost:8787`.

---

## JWT Authentication

The `Authorization: Bearer <token>` middleware auto-detects the algorithm from the JWT header:

| Algorithm | Verification method |
|-----------|-------------------|
| `ES256` | Fetches Supabase JWKS from `SUPABASE_JWKS_URL`. Keys are cached in memory for **1 hour** to avoid a fetch on every request. |
| `HS256` | Verifies signature using `SUPABASE_JWT_SECRET`. |

If the algorithm in the token header is neither `ES256` nor `HS256`, the request is rejected with `401`.

---

## API Reference

Base URL: `https://api.wordsus.com/v1` (production) or `http://localhost:8787` (local)

All routes except `/health` require `Authorization: Bearer <supabase_jwt>`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (unauthenticated) |
| GET | `/reading` | List reading progress |
| PUT | `/reading/:locale/:bookSlug` | Upsert reading progress |
| DELETE | `/reading/:locale/:bookSlug` | Soft-delete reading progress |
| GET | `/favorites` | List favorites |
| POST | `/favorites` | Add a favorite |
| DELETE | `/favorites/:locale/:bookSlug` | Soft-delete a favorite |
| GET | `/recent` | List recent books |
| PUT | `/recent` | Batch upsert recent books |
| DELETE | `/recent/:locale/:bookSlug` | Soft-delete a recent book |
| GET | `/preferences` | Get all preferences |
| PUT | `/preferences` | Batch upsert preferences |
| GET | `/sync?since=<iso>` | Pull all changes since timestamp |
| POST | `/sync` | Push batch of local changes |

See [`design/openapi.yml`](../design/openapi.yml) for the full OpenAPI 3.1 specification.

---

## Database Migrations

Migrations are managed with `wrangler d1 migrations` and live in `migrations/`.

### Create a new migration

```bash
pnpm migration:create <description>
# e.g. pnpm migration:create add-font-size-preference
# → creates migrations/0002_add-font-size-preference.sql
```

### Apply migrations

```bash
# Local development (manual)
pnpm migrate:local

# Production (manual — or done automatically by CI, see below)
pnpm migrate:remote
```

---

## Deployment

### Production via GitHub integration

Production is deployed automatically through the **Cloudflare Workers native GitHub integration**:

1. Push to `main` (or merge a PR)
2. The integration runs the configured deploy command:
   ```bash
   wrangler d1 migrations apply wordsus-prod --remote && wrangler deploy
   ```
3. Migrations are applied first; the Worker deploys only if migrations succeed

> Configure the deploy command once in the Cloudflare Dashboard under **Workers & Pages → [project] → Settings → Builds & Deployments**.

### Manual deploy

```bash
# Apply migrations to production first
pnpm migrate:remote

# Deploy the Worker
pnpm deploy
```

### Set production secrets

```bash
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_JWKS_URL
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_JWT_SECRET` | If using HS256 | JWT secret from Supabase Dashboard → Settings → API |
| `SUPABASE_JWKS_URL` | If using ES256 | JWKS endpoint, e.g. `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` |

Set in `.dev.vars` for local development. Set via `wrangler secret put` for production.

---

## Security Notes

- CORS is restricted to `https://wordsus.com` (and `localhost:3000` for development)
- All routes except `/health` require a valid JWT
- All D1 queries use prepared statements (no SQL injection)
- Data is never physically deleted — `deletedAt` is used for soft deletes
- JWKS keys are cached in-memory for 1 hour per Worker isolate instance
