# Wordsus — Frontend Design

## 1. Overview

Wordsus is a free online reading platform that offers curated educational books and courses. The frontend is a **statically exported Next.js application** deployed to Cloudflare Pages. It provides a book-reader experience with chapter navigation, reading progress tracking, favorites, search, i18n (English/Spanish), dark/light/system theme, and audio/video support for chapters.

Currently all user session data (reading progress, favorites, recent books, theme preference) is stored locally in the browser via `localStorage`. An upcoming enhancement will add **optional authentication via Supabase** so that user data syncs across devices transparently. Authentication will be non-mandatory — unauthenticated users will continue to use the app exactly as they do today (local-only mode).

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, static export via `output: "export"`) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| i18n | next-intl (en, es) |
| Images | next-image-export-optimizer |
| Markdown | remark + rehype pipeline (GFM, math/KaTeX, syntax highlighting) |
| Hosting | Cloudflare Pages (static assets served via Wrangler) |
| Analytics | Google Analytics (GA4) |
| Ads | Google AdSense + custom ad script |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Static Export (out/)                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Next.js App Router                     │  │
│  │                                                    │  │
│  │  app/layout.tsx           ← Root layout (fonts,    │  │
│  │                              theme script, GA)     │  │
│  │  app/[locale]/layout.tsx  ← Locale layout (Header, │  │
│  │                              Footer, intl provider)│  │
│  │  app/[locale]/page.tsx    ← Home (hero + categories│  │
│  │                              + continue reading)   │  │
│  │  app/[locale]/[slug]/     ← Book reader or         │  │
│  │                              Category page         │  │
│  │  app/[locale]/favorites/  ← Favorites page         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Client Components                     │  │
│  │                                                    │  │
│  │  BookClient.tsx      ← Reader (chapters, sidebar,  │  │
│  │                         ToC, progress, nav)        │  │
│  │  HomeClient.tsx      ← Continue Reading + category │  │
│  │                         grid                       │  │
│  │  FavoritesClient.tsx ← Favorites grouped by locale │  │
│  │  Header.tsx          ← Navigation, theme, locale,  │  │
│  │                         search trigger             │  │
│  │  SearchModal.tsx     ← Client-side full-text search│  │
│  │  RecentBookCard.tsx  ← Recent book card with       │  │
│  │                         progress bar               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Lib / Utilities                        │  │
│  │                                                    │  │
│  │  lib/content.ts         ← Build-time content loader│  │
│  │                            (books, chapters, cats) │  │
│  │  lib/readingProgress.ts ← localStorage helpers     │  │
│  │  lib/types.ts           ← Shared TypeScript types  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Static Assets (public/)               │  │
│  │                                                    │  │
│  │  chapter-content/{locale}/{book}/{chapter}.json    │  │
│  │  search-index/{locale}.json                        │  │
│  │  images/                                           │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
        │
        │  Deployed to
        ▼
┌───────────────────┐
│ Cloudflare Pages  │
│ (static hosting)  │
└───────────────────┘
```

---

## 4. Content Model

### 4.1 Books

Books are defined in `content/{locale}/books/{slug}/book.json` with chapters as individual `.md` files in the same directory.

```typescript
interface BookMeta {
  slug: string;
  locale: Locale;
  title: string;
  subtitle?: string;
  author: string;
  description: string;
  cover: string;
  category: string;
  tags: string[];
  featured: boolean;
  publishedAt: string;
  language: string;
  chapters: ChapterMeta[];
  parts?: BookPart[];       // Optional grouping of chapters
}

interface ChapterMeta {
  slug: string;
  title: string;
  order: number;
  description?: string;
  audioUrl?: string;
  videoUrl?: string;
  draft?: boolean;          // Excluded from builds
}
```

### 4.2 Categories

Defined in `content/{locale}/categories/{slug}.json`:

```typescript
interface CategoryMeta {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  icon: string;
  order?: number;
}
```

### 4.3 Build-Time Generation

At build time, the app generates:
- **Chapter JSON files** (`public/chapter-content/{locale}/{book}/{chapter}.json`) — pre-rendered HTML + ToC for each chapter, fetched client-side for SPA-style navigation.
- **Search index** (`public/search-index/{locale}.json`) — lightweight book metadata for client-side search.

---

## 5. Routing

| Path | Content |
|------|---------|
| `/{locale}` | Home page (hero, continue reading, categories grid) |
| `/{locale}/{bookSlug}` | Book reader (intro view) |
| `/{locale}/{bookSlug}/{chapterSlug}` | Book reader (specific chapter) |
| `/{locale}/{categorySlug}` | Category listing page |
| `/{locale}/favorites` | Favorites page |
| `/{locale}/about` | About page |
| `/{locale}/privacy` | Privacy policy |
| `/{locale}/terms` | Terms of service |
| `/{locale}/cookies` | Cookie policy |

The `[slug]` route dynamically resolves to either a book or a category at build time.

---

## 6. User Session (Current — Local Only)

All user data is persisted in `localStorage` with the following keys:

| Key | Value | Description |
|-----|-------|-------------|
| `wordsus-chapter-{locale}-{slug}` | `string` | Last visited chapter slug per book |
| `wordsus-scroll-{locale}-{slug}` | `JSON (ScrollPositions)` | Scroll offsets (window + sidebars) per book |
| `wordsus-favorites` | `JSON (string[])` | Array of `"locale:slug"` keys |
| `wordsus-recent` | `JSON (string[])` | Ordered array of `"locale:slug"` keys (most recent first) |
| `wordsus-theme` | `"light" \| "dark" \| "system"` | Theme preference |

### 6.1 Reading Progress

- On chapter load, the current chapter slug is saved for that book.
- Scroll positions (window, left sidebar, right sidebar) are debounced (500ms) and persisted.
- On return to a book, the saved chapter and scroll positions are restored.
- Progress is calculated as `(currentChapter.order / totalChapters) * 100`.

### 6.2 Favorites

- User can favorite/unfavorite books from the book reader sidebar.
- Favorites page groups books by locale.

### 6.3 Recent Books

- Each book visit pushes its key to the front of the recent list.
- Home page shows "Continue Reading" section with progress indicators.

---

## 7. Key Features

### 7.1 Book Reader (`BookClient`)

- **Three-panel layout**: left sidebar (chapter list), center (content), right sidebar (ToC)
- **Responsive**: sidebars collapse into overlays on mobile with hamburger/ToC toggles
- **Chapter navigation**: SPA-style via fetched JSON (no full page reload)
- **Book intro view**: displays book metadata, description, and chapter overview
- **Progress bar**: sticky strip at top showing reading percentage
- **Progress management**: mark all as read, reset progress
- **Code blocks**: macOS-style header with language tag + copy button (DOM-injected via MutationObserver)
- **Audio player**: per-chapter audio widget
- **Video embed**: YouTube iframe for chapters with `videoUrl`
- **URL management**: `pushState`/`replaceState` for chapter URLs without page reload

### 7.2 Search

- Client-side search over a pre-built JSON index
- Matches on title, author, description, and tags
- Modal overlay with instant results (max 8)

### 7.3 Theme

- Light / Dark / System modes
- Flash-free via inline `<script>` that reads localStorage before paint
- Theme toggle dropdown in header

### 7.4 Internationalization

- Two locales: `en`, `es`
- Locale prefix always present in URL (`/en/...`, `/es/...`)
- Language switcher in header
- Content is independently authored per locale

---

## 8. Future: Cloud Sync & Authentication

### 8.1 Goals

- **Optional authentication** via Supabase Auth (email, Google, Apple)
- **Cross-device sync** of reading progress, favorites, recent books, and preferences
- **Offline-first**: the app remains fully functional without network; syncs when online
- **Transparent**: authenticated users see their data sync automatically in the background

### 8.2 TanStack Query Integration

All user-data reads/writes will be managed via **TanStack Query (React Query)**:

- **Queries** wrap remote data fetching with intelligent caching, deduplication, and background refetch
- **Mutations** handle writes to the backend
- **Local fallback**: when unauthenticated, queries resolve from `localStorage` directly (no network calls)
- **Stale-while-revalidate**: authenticated users see local data immediately while background sync runs

### 8.3 Optimistic UI

Mutations (save chapter, toggle favorite, update preference) use **optimistic updates**:

1. UI updates immediately with the expected outcome (local state + TanStack Query cache)
2. Mutation fires in the background to the backend API
3. On success: cache is confirmed
4. On failure: cache rolls back to previous state, user sees a non-intrusive error toast

This ensures the app always feels instant regardless of network latency.

### 8.4 Authentication Flow

1. User taps "Sign In" (new button in Header) → Supabase Auth UI (email / OAuth)
2. On success, a Supabase JWT is stored in memory (not localStorage, for security)
3. TanStack Query's `queryClient` is reconfigured to include the Bearer token in API calls
4. An initial sync merges local data with server data (last-write-wins)
5. Subsequent reads/writes go through the API transparently

If the user chooses not to sign in, **nothing changes** — the app operates exactly as it does today with pure localStorage.

### 8.5 Sync Strategy

| Scenario | Behavior |
|----------|----------|
| First login (no server data) | Push all local data to server |
| Login on new device | Pull all server data, merge with any local data (last-write-wins by `updatedAt`) |
| Normal usage (authenticated) | Optimistic writes to local + background push; periodic pull for freshness |
| Offline | All writes go to local; queued mutations replay on reconnect |
| Logout | Local data remains; no more network sync |

### 8.6 Data Model Changes

Each locally-stored record will gain sync metadata:

```typescript
interface SyncMeta {
  id: string;           // UUID v4 (client-generated)
  updatedAt: string;    // ISO 8601
  deletedAt?: string;   // Soft delete
  syncStatus: 'synced' | 'pending' | 'conflict';
}
```

### 8.7 New Dependencies

| Package | Purpose |
|---------|---------|
| `@tanstack/react-query` | Data fetching, caching, optimistic updates |
| `@supabase/supabase-js` | Authentication client |

---

## 9. Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                    # Root layout (fonts, theme, GA, ads)
│   ├── globals.css                   # Tailwind + custom prose styles
│   ├── [locale]/
│   │   ├── layout.tsx                # Locale layout (Header, Footer, intl)
│   │   ├── page.tsx                  # Home page
│   │   ├── [slug]/
│   │   │   ├── page.tsx              # Book or Category page
│   │   │   └── [chapterSlug]/
│   │   │       └── page.tsx          # Chapter deep-link (SSG)
│   │   ├── favorites/page.tsx
│   │   ├── about/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   └── cookies/page.tsx
├── components/
│   ├── AudioPlayer.tsx
│   ├── BookCard.tsx
│   ├── BookClient.tsx                # Main book reader component
│   ├── BookIntro.tsx
│   ├── CategoryPage.tsx
│   ├── ContactSection.tsx
│   ├── FavoritesClient.tsx
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── HeroSection.tsx
│   ├── HomeClient.tsx
│   ├── IntroToc.tsx
│   ├── RecentBookCard.tsx
│   ├── SearchModal.tsx
│   └── TableOfContents.tsx
├── lib/
│   ├── content.ts                    # Build-time content loader
│   ├── readingProgress.ts            # localStorage utilities
│   └── types.ts                      # Shared types
├── i18n/
│   └── routing.ts                    # Locale config (en, es)
├── messages/
│   ├── en.json
│   └── es.json
├── content/                          # Markdown books + category JSON
├── public/                           # Static assets + generated JSON
├── next.config.ts                    # Static export + image optimizer
├── wrangler.jsonc                    # Cloudflare Pages deployment
├── package.json
└── tsconfig.json
```

---

## 10. Deployment

| Command | Action |
|---------|--------|
| `pnpm dev` | Local development server |
| `pnpm build` | Static export to `out/` + image optimization |
| `pnpm wrangler deploy` | Deploy to Cloudflare Pages |

The site is fully static — no server-side rendering at request time. All pages and chapter content are pre-built.

---

## 11. Design System

- **CSS Variables**: HSL-based custom properties for theming (`--background`, `--foreground`, `--primary`, `--accent`, etc.)
- **Font**: Inter (via Google Fonts, variable)
- **Prose**: Custom `.prose-wordsus` class for chapter content styling
- **Animations**: `fadeIn`, `slideUp` utility animations
- **Responsive breakpoints**: mobile-first; `lg` for sidebar visibility, `xl` for ToC sidebar
