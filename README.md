# Wordsus

**Free online reading platform for curated educational books and courses.**

Wordsus offers a beautiful, distraction-free reading experience with chapter navigation, reading progress tracking, cross-device sync, search, dark/light theme, and full internationalization (English & Spanish).

🌐 **[wordsus.com](https://wordsus.com)**

---

## Architecture

Wordsus is built as a **monorepo** with two independent layers:

```
wordsus-static-site/
├── frontend/   ← Next.js static site (Cloudflare Pages)
├── backend/    ← Hono REST API (Cloudflare Workers + D1)
└── design/     ← Design documents and OpenAPI spec
```

### Frontend

A **statically exported Next.js application** deployed to Cloudflare Pages. All content is pre-built at compile time and served as static files — no server-side rendering at request time.

| | |
|---|---|
| **Framework** | Next.js 16 (App Router, `output: "export"`) |
| **Styling** | Tailwind CSS 4 |
| **i18n** | next-intl — English & Spanish |
| **Content** | Markdown files processed at build time |
| **User data** | `localStorage` (offline-first, no auth required) |
| **Hosting** | Cloudflare Pages via Wrangler |

User session data (reading progress, favorites, recent books, theme) is stored locally in the browser by default. When the user optionally signs in, data syncs transparently across devices via the backend.

### Backend

A lightweight **REST API** deployed on Cloudflare Workers. It is **entirely optional** — the frontend works fully without it.

| | |
|---|---|
| **Runtime** | Cloudflare Workers (V8 isolates) |
| **Framework** | Hono |
| **Database** | Cloudflare D1 (edge SQLite) |
| **Auth** | Supabase Auth — JWT verification only (ES256 via JWKS or HS256 via secret) |
| **Migrations** | Wrangler D1 migrations |

The backend provides cross-device sync for reading progress, favorites, recent books, and preferences. It never manages credentials — authentication is delegated entirely to Supabase Auth.

### Design

Architecture and API contracts live in `design/`:

| File | Description |
|------|-------------|
| [`design/frontend-design.md`](design/frontend-design.md) | Frontend architecture, component map, localStorage schema, and future cloud sync design |
| [`design/backend-design.md`](design/backend-design.md) | Backend architecture, D1 schema, sync protocol, deployment, and security |
| [`design/openapi.yml`](design/openapi.yml) | OpenAPI 3.1 specification for the REST API |

---

## Repository Structure

```
wordsus-static-site/
│
├── frontend/                     # Next.js static site
│   ├── app/                      # App Router pages
│   ├── components/               # React components
│   ├── lib/                      # Content loader, localStorage utils, types
│   ├── content/                  # Markdown books + category definitions
│   ├── messages/                 # i18n translation strings (en, es)
│   ├── public/                   # Static assets + build-generated JSON
│   ├── wrangler.jsonc            # Cloudflare Pages deployment config
│   └── next.config.ts            # Static export configuration
│
├── backend/                      # Cloudflare Workers API
│   ├── src/
│   │   ├── index.ts              # App entry (CORS, routing)
│   │   ├── middleware/           # JWT auth + error handling
│   │   ├── routes/               # reading, favorites, recent, preferences, sync
│   │   ├── db/                   # D1 query helpers
│   │   ├── utils/                # Validation, timestamps
│   │   └── types/                # Shared TypeScript types
│   ├── migrations/               # Wrangler D1 migration files
│   ├── wrangler.toml             # Workers + D1 configuration
│   └── README.md                 # Backend setup and usage guide
│
└── design/                       # Architecture and API design docs
    ├── frontend-design.md
    ├── backend-design.md
    └── openapi.yml
```

---

## Getting Started

### Frontend

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # static export → out/
pnpm wrangler deploy
```

### Backend

```bash
cd backend
pnpm install
cp .dev.vars.example .dev.vars   # fill in Supabase credentials
pnpm migrate:local               # apply D1 migrations locally
pnpm dev                         # http://localhost:8787
```

See [`backend/README.md`](backend/README.md) for full setup instructions, environment variables, and deployment guide.

---

## Key Features

- **Offline-first** — fully functional without an account or network connection
- **Optional cloud sync** — sign in with Supabase Auth to sync progress across devices
- **Static delivery** — all content pre-rendered; no runtime server costs
- **Edge-native** — frontend on Cloudflare Pages, backend on Cloudflare Workers, database on D1
- **Bilingual** — all UI and content available in English and Spanish
- **Dark / Light / System** theme with flash-free detection
- **SPA-style reader** — chapter navigation without page reloads via client-side JSON fetching

---

## License

MIT
