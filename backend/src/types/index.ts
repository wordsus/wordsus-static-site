export type Locale = 'en' | 'es'

export interface Env {
  DB: D1Database
  SUPABASE_URL: string
  SUPABASE_JWT_SECRET?: string
  SUPABASE_JWKS_URL?: string
  ENVIRONMENT?: string
}

export interface JwtVariables {
  userId: string
}

// ─── Domain records ──────────────────────────────────────────────────────────

export interface ReadingProgress {
  id: string
  userId: string
  locale: Locale
  bookSlug: string
  chapterSlug: string
  scrollContent: number
  scrollLeftSidebar: number
  scrollRightSidebar: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Favorite {
  id: string
  userId: string
  locale: Locale
  bookSlug: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface RecentBook {
  id: string
  userId: string
  locale: Locale
  bookSlug: string
  order: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface UserPreference {
  userId: string
  key: string
  value: string
  updatedAt: string
}

// ─── API input shapes (client-provided) ──────────────────────────────────────

export interface ReadingProgressInput {
  id: string
  chapterSlug: string
  scrollContent: number
  scrollLeftSidebar: number
  scrollRightSidebar: number
  updatedAt: string
  deletedAt?: string | null
}

export interface FavoriteInput {
  id: string
  locale: Locale
  bookSlug: string
  updatedAt: string
  deletedAt?: string | null
}

export interface RecentBookInput {
  id: string
  locale: Locale
  bookSlug: string
  order: number
  updatedAt: string
  deletedAt?: string | null
}

export interface PreferenceInput {
  key: string
  value: string
  updatedAt: string
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export interface SyncReadingProgressInput extends ReadingProgressInput {
  locale: Locale
  bookSlug: string
}

export interface SyncPushBody {
  readingProgress?: SyncReadingProgressInput[]
  favorites?: FavoriteInput[]
  recentBooks?: RecentBookInput[]
  preferences?: PreferenceInput[]
}

export interface SyncConflict {
  type: 'readingProgress' | 'favorites' | 'recentBooks' | 'preferences'
  id: string
  serverVersion: unknown
}

// ─── Error response ───────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  message: string
  details?: { field: string; issue: string }[]
}
