# Wordsus — Backend Design

## 1. Overview

The Wordsus backend is a lightweight REST API that enables cross-device synchronization of user data (reading progress, favorites, recent books, preferences). It runs on **Cloudflare Workers** with **Hono** as the web framework and **D1** (Cloudflare's edge SQLite) as the database.

Authentication is handled by **Supabase Auth** — the backend only verifies JWTs; it does not manage credentials directly.

The backend is **optional** — the frontend works fully without it (local-only mode). When authenticated, user data syncs transparently in the background.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers (V8 isolates, edge-deployed) |
| Framework | Hono (lightweight, Workers-native) |
| Database | Cloudflare D1 (SQLite at the edge) |
| Auth | Supabase Auth (JWT verification only) |
| Deployment | Wrangler CLI → Cloudflare |

---

## 3. Architecture

```
┌──────────────────────────────────────────────┐
│               Cloudflare Edge                │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │         Hono Application               │  │
│  │                                        │  │
│  │  middleware/auth.ts  ← JWT verify      │  │
│  │  routes/reading.ts                     │  │
│  │  routes/favorites.ts                   │  │
│  │  routes/recent.ts                      │  │
│  │  routes/preferences.ts                 │  │
│  │  routes/sync.ts                        │  │
│  └───────────────┬────────────────────────┘  │
│                  │                           │
│  ┌───────────────▼────────────────────────┐  │
│  │           Cloudflare D1                │  │
│  │     (SQLite — edge-replicated)         │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
         ▲
         │  HTTPS + Bearer JWT
         │
┌────────┴──────────┐
│   Wordsus PWA     │
│  (static, CF Pages)│
└───────────────────┘
```

---

## 4. Authentication

### 4.1 Flow

1. User signs in via Supabase Auth in the frontend (email, Google, or Apple)
2. Frontend receives a Supabase JWT access token
3. All API requests include: `Authorization: Bearer <supabase_jwt>`
4. The Worker verifies the JWT signature using Supabase's JWT secret (cached)
5. Extracts `sub` claim as `userId`

### 4.2 Middleware

```typescript
// middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

export const authMiddleware = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  const token = header.slice(7)
  try {
    const payload = await verify(token, c.env.SUPABASE_JWT_SECRET)
    c.set('userId', payload.sub as string)
  } catch {
    return c.json({ error: 'invalidToken' }, 401)
  }
  await next()
})
```

### 4.3 Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_JWT_SECRET` | Supabase project JWT secret (for HS256 verification) |
| `SUPABASE_URL` | Supabase project URL (for optional admin calls) |

---

## 5. Database Schema (D1)

```sql
-- Users table (minimal — auth is in Supabase)
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- Supabase Auth user ID (UUID)
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reading Progress (one per user per locale+book)
CREATE TABLE reading_progress (
  id TEXT PRIMARY KEY,           -- UUID v4 (generated client-side)
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  bookSlug TEXT NOT NULL,
  chapterSlug TEXT NOT NULL,
  scrollContent REAL NOT NULL DEFAULT 0,
  scrollLeftSidebar REAL NOT NULL DEFAULT 0,
  scrollRightSidebar REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT,                -- Soft delete for sync
  UNIQUE(userId, locale, bookSlug)
);

CREATE INDEX idx_reading_user_updated ON reading_progress(userId, updatedAt);

-- Favorites
CREATE TABLE favorites (
  id TEXT PRIMARY KEY,           -- UUID v4 (generated client-side)
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  bookSlug TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT,                -- Soft delete for sync
  UNIQUE(userId, locale, bookSlug)
);

CREATE INDEX idx_favorites_user_updated ON favorites(userId, updatedAt);

-- Recent Books (ordered reading history)
CREATE TABLE recent_books (
  id TEXT PRIMARY KEY,           -- UUID v4 (generated client-side)
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  bookSlug TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,  -- Lower = more recent
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT,                -- Soft delete for sync
  UNIQUE(userId, locale, bookSlug)
);

CREATE INDEX idx_recent_user_updated ON recent_books(userId, updatedAt);
CREATE INDEX idx_recent_user_order ON recent_books(userId, "order");

-- User Preferences (key-value per user)
CREATE TABLE user_preferences (
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (userId, key)
);

CREATE INDEX idx_preferences_user_updated ON user_preferences(userId, updatedAt);
```

---

## 6. API Design Principles

- **RESTful**: resources as nouns, HTTP verbs for actions
- **JSON**: all request/response bodies are JSON
- **lowerCamelCase**: all field names use lowerCamelCase
- **Timestamps**: ISO 8601 strings (UTC)
- **IDs**: UUID v4, generated client-side (enables offline creation)
- **Soft deletes**: `deletedAt` field for sync-aware deletion
- **Idempotent writes**: PUT for upserts, client-generated IDs prevent duplicates

---

## 7. API Routes

### Base URL

```
https://api.wordsus.com/v1
```

### Route Overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (unauthenticated) |
| GET | `/reading` | List user's reading progress |
| PUT | `/reading/:locale/:bookSlug` | Upsert reading progress for a book |
| DELETE | `/reading/:locale/:bookSlug` | Soft-delete reading progress |
| GET | `/favorites` | List user's favorites |
| POST | `/favorites` | Add a favorite |
| DELETE | `/favorites/:locale/:bookSlug` | Soft-delete a favorite |
| GET | `/recent` | List user's recent books (ordered) |
| PUT | `/recent` | Batch upsert recent books list |
| DELETE | `/recent/:locale/:bookSlug` | Soft-delete a recent book entry |
| GET | `/preferences` | Get all preferences |
| PUT | `/preferences` | Batch upsert preferences |
| GET | `/sync` | Pull changes since timestamp |
| POST | `/sync` | Push batch of local changes |

---

## 8. Sync Protocol

### 8.1 Design Goals

- **Offline-first**: client mutates locally, then syncs when online
- **Incremental**: only transfer changes since last sync
- **Idempotent**: re-sending the same push has no side effects
- **Conflict resolution**: last-write-wins via `updatedAt`

### 8.2 Pull

```
GET /v1/sync?since=2024-01-01T00:00:00Z
```

Returns all records modified after `since` across all resource types:

```json
{
  "readingProgress": [...],
  "favorites": [...],
  "recentBooks": [...],
  "preferences": [...],
  "serverTime": "2025-06-14T12:00:00Z"
}
```

The client stores `serverTime` and uses it for the next pull.

### 8.3 Push

```
POST /v1/sync
```

Body contains all locally-modified records:

```json
{
  "readingProgress": [
    {
      "id": "...",
      "locale": "en",
      "bookSlug": "kubernetes-handbook",
      "chapterSlug": "pods",
      "scrollContent": 450.5,
      "scrollLeftSidebar": 120,
      "scrollRightSidebar": 0,
      "updatedAt": "2025-06-14T10:30:00Z"
    }
  ],
  "favorites": [
    { "id": "...", "locale": "en", "bookSlug": "kubernetes-handbook", "updatedAt": "..." }
  ],
  "recentBooks": [
    { "id": "...", "locale": "en", "bookSlug": "kubernetes-handbook", "order": 0, "updatedAt": "..." }
  ],
  "preferences": [
    { "key": "theme", "value": "dark", "updatedAt": "..." }
  ]
}
```

Server applies each change using last-write-wins:
- If server's `updatedAt` > client's `updatedAt` → reject (return server version)
- Otherwise → apply client's version

Response includes any conflicts:

```json
{
  "applied": 8,
  "conflicts": [
    { "type": "readingProgress", "id": "...", "serverVersion": {...} }
  ],
  "serverTime": "2025-06-14T12:00:01Z"
}
```

### 8.4 Initial Sync (First Login)

When a user logs in for the first time (no server data exists):
1. Client pushes all local data via `POST /sync`
2. Server creates user record + inserts all data
3. Client marks all records as `syncStatus: 'synced'`

### 8.5 Merge (Existing User, New Device)

When a user logs in on a new device:
1. Client calls `GET /sync?since=1970-01-01T00:00:00Z` (full pull)
2. Client merges server data with any existing local data (last-write-wins)
3. Client pushes any local-only changes via push

---

## 9. Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 404 | Not Found |
| 409 | Conflict (sync conflict detail in body) |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": "validationFailed",
  "message": "Field 'bookSlug' is required",
  "details": [
    { "field": "bookSlug", "issue": "required" }
  ]
}
```

---

## 10. Rate Limiting

Implemented via Cloudflare's built-in rate limiting or a simple D1-backed counter:

| Endpoint | Limit |
|----------|-------|
| All authenticated | 100 req/min per user |
| `POST /sync` | 10 req/min per user |
| `GET /health` | 60 req/min per IP |
| Other unauthenticated | Rejected (401) |

---

## 11. Project Structure

```
backend/
├── src/
│   ├── index.ts              # Hono app entry, route registration
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification middleware
│   │   └── error.ts          # Global error handler
│   ├── routes/
│   │   ├── reading.ts        # /reading CRUD
│   │   ├── favorites.ts      # /favorites CRUD
│   │   ├── recent.ts         # /recent CRUD
│   │   ├── preferences.ts    # /preferences
│   │   └── sync.ts           # /sync pull & push
│   ├── db/
│   │   ├── schema.sql        # D1 table definitions
│   │   └── queries.ts        # Typed query helpers
│   ├── types/
│   │   └── index.ts          # Shared types (mirrors frontend models)
│   └── utils/
│       ├── validation.ts     # Request body validation
│       └── timestamps.ts     # ISO 8601 helpers
├── wrangler.toml             # Workers config (D1 binding, env vars)
├── package.json
└── tsconfig.json
```

---

## 12. Wrangler Configuration

```toml
name = "wordsus-api"
main = "src/index.ts"
compatibility_date = "2025-06-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "wordsus-prod"
database_id = "<d1-database-id>"

# Secrets (set via `wrangler secret put`):
# - SUPABASE_JWT_SECRET
# - SUPABASE_URL
```

---

## 13. Deployment

| Command | Action |
|---------|--------|
| `wrangler dev` | Local development with D1 |
| `wrangler d1 execute wordsus-prod --file=src/db/schema.sql` | Apply schema |
| `wrangler deploy` | Deploy to Cloudflare Workers |

---

## 14. Security Considerations

- **No CORS wildcards**: only allow `https://wordsus.com` origin
- **JWT verification**: every request validated; no session cookies on the API
- **Input validation**: all request bodies validated with strict schemas
- **SQL injection**: D1 prepared statements with bound parameters only
- **Soft deletes**: data is never physically deleted (audit trail + undo)
- **Rate limiting**: prevents abuse from compromised tokens
- **No PII beyond email**: Supabase stores auth details; D1 only stores user UUID
