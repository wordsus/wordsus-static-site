import type {
  ReadingProgress,
  Favorite,
  RecentBook,
  UserPreference,
} from '../types/index.js'

// ─── User ─────────────────────────────────────────────────────────────────────

export async function ensureUser(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id) VALUES (?)
       ON CONFLICT(id) DO UPDATE SET updatedAt = datetime('now')`
    )
    .bind(userId)
    .run()
}

// ─── Reading Progress ─────────────────────────────────────────────────────────

export async function getReadingProgressForUser(
  db: D1Database,
  userId: string
): Promise<ReadingProgress[]> {
  const { results } = await db
    .prepare(`SELECT * FROM reading_progress WHERE userId = ? AND deletedAt IS NULL ORDER BY updatedAt DESC`)
    .bind(userId)
    .all<ReadingProgress>()
  return results
}

export async function getReadingProgressSince(
  db: D1Database,
  userId: string,
  since: string
): Promise<ReadingProgress[]> {
  const { results } = await db
    .prepare(`SELECT * FROM reading_progress WHERE userId = ? AND updatedAt > ?`)
    .bind(userId, since)
    .all<ReadingProgress>()
  return results
}

export async function upsertReadingProgress(
  db: D1Database,
  userId: string,
  locale: string,
  bookSlug: string,
  data: {
    id: string
    chapterSlug: string
    scrollContent: number
    scrollLeftSidebar: number
    scrollRightSidebar: number
    updatedAt: string
    deletedAt?: string | null
    createdAt?: string
  }
): Promise<ReadingProgress> {
  const createdAt = data.createdAt ?? data.updatedAt
  await db
    .prepare(
      `INSERT INTO reading_progress
         (id, userId, locale, bookSlug, chapterSlug, scrollContent, scrollLeftSidebar, scrollRightSidebar, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(userId, locale, bookSlug) DO UPDATE SET
         id = excluded.id,
         chapterSlug = excluded.chapterSlug,
         scrollContent = excluded.scrollContent,
         scrollLeftSidebar = excluded.scrollLeftSidebar,
         scrollRightSidebar = excluded.scrollRightSidebar,
         updatedAt = excluded.updatedAt,
         deletedAt = excluded.deletedAt
       WHERE excluded.updatedAt >= reading_progress.updatedAt`
    )
    .bind(
      data.id, userId, locale, bookSlug,
      data.chapterSlug, data.scrollContent, data.scrollLeftSidebar, data.scrollRightSidebar,
      createdAt, data.updatedAt, data.deletedAt ?? null
    )
    .run()

  const row = await db
    .prepare(`SELECT * FROM reading_progress WHERE userId = ? AND locale = ? AND bookSlug = ?`)
    .bind(userId, locale, bookSlug)
    .first<ReadingProgress>()
  if (!row) throw new Error('Reading progress not found after upsert')
  return row
}

export async function softDeleteReadingProgress(
  db: D1Database,
  userId: string,
  locale: string,
  bookSlug: string,
  updatedAt: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE reading_progress SET deletedAt = ?, updatedAt = ?
       WHERE userId = ? AND locale = ? AND bookSlug = ? AND deletedAt IS NULL`
    )
    .bind(updatedAt, updatedAt, userId, locale, bookSlug)
    .run()
  return (result.meta.changes ?? 0) > 0
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export async function getFavoritesForUser(
  db: D1Database,
  userId: string
): Promise<Favorite[]> {
  const { results } = await db
    .prepare(`SELECT * FROM favorites WHERE userId = ? AND deletedAt IS NULL ORDER BY updatedAt DESC`)
    .bind(userId)
    .all<Favorite>()
  return results
}

export async function getFavoritesSince(
  db: D1Database,
  userId: string,
  since: string
): Promise<Favorite[]> {
  const { results } = await db
    .prepare(`SELECT * FROM favorites WHERE userId = ? AND updatedAt > ?`)
    .bind(userId, since)
    .all<Favorite>()
  return results
}

export async function upsertFavorite(
  db: D1Database,
  userId: string,
  data: {
    id: string
    locale: string
    bookSlug: string
    updatedAt: string
    deletedAt?: string | null
    createdAt?: string
  }
): Promise<Favorite> {
  const createdAt = data.createdAt ?? data.updatedAt
  await db
    .prepare(
      `INSERT INTO favorites (id, userId, locale, bookSlug, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(userId, locale, bookSlug) DO UPDATE SET
         id = excluded.id,
         updatedAt = excluded.updatedAt,
         deletedAt = excluded.deletedAt
       WHERE excluded.updatedAt >= favorites.updatedAt`
    )
    .bind(data.id, userId, data.locale, data.bookSlug, createdAt, data.updatedAt, data.deletedAt ?? null)
    .run()

  const row = await db
    .prepare(`SELECT * FROM favorites WHERE userId = ? AND locale = ? AND bookSlug = ?`)
    .bind(userId, data.locale, data.bookSlug)
    .first<Favorite>()
  if (!row) throw new Error('Favorite not found after upsert')
  return row
}

export async function softDeleteFavorite(
  db: D1Database,
  userId: string,
  locale: string,
  bookSlug: string,
  updatedAt: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE favorites SET deletedAt = ?, updatedAt = ?
       WHERE userId = ? AND locale = ? AND bookSlug = ? AND deletedAt IS NULL`
    )
    .bind(updatedAt, updatedAt, userId, locale, bookSlug)
    .run()
  return (result.meta.changes ?? 0) > 0
}

// ─── Recent Books ─────────────────────────────────────────────────────────────

export async function getRecentBooksForUser(
  db: D1Database,
  userId: string
): Promise<RecentBook[]> {
  const { results } = await db
    .prepare(`SELECT * FROM recent_books WHERE userId = ? AND deletedAt IS NULL ORDER BY "order" ASC`)
    .bind(userId)
    .all<RecentBook>()
  return results
}

export async function getRecentBooksSince(
  db: D1Database,
  userId: string,
  since: string
): Promise<RecentBook[]> {
  const { results } = await db
    .prepare(`SELECT * FROM recent_books WHERE userId = ? AND updatedAt > ?`)
    .bind(userId, since)
    .all<RecentBook>()
  return results
}

export async function upsertRecentBook(
  db: D1Database,
  userId: string,
  data: {
    id: string
    locale: string
    bookSlug: string
    order: number
    updatedAt: string
    deletedAt?: string | null
    createdAt?: string
  }
): Promise<RecentBook> {
  const createdAt = data.createdAt ?? data.updatedAt
  await db
    .prepare(
      `INSERT INTO recent_books (id, userId, locale, bookSlug, "order", createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(userId, locale, bookSlug) DO UPDATE SET
         id = excluded.id,
         "order" = excluded."order",
         updatedAt = excluded.updatedAt,
         deletedAt = excluded.deletedAt
       WHERE excluded.updatedAt >= recent_books.updatedAt`
    )
    .bind(data.id, userId, data.locale, data.bookSlug, data.order, createdAt, data.updatedAt, data.deletedAt ?? null)
    .run()

  const row = await db
    .prepare(`SELECT * FROM recent_books WHERE userId = ? AND locale = ? AND bookSlug = ?`)
    .bind(userId, data.locale, data.bookSlug)
    .first<RecentBook>()
  if (!row) throw new Error('Recent book not found after upsert')
  return row
}

export async function softDeleteRecentBook(
  db: D1Database,
  userId: string,
  locale: string,
  bookSlug: string,
  updatedAt: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE recent_books SET deletedAt = ?, updatedAt = ?
       WHERE userId = ? AND locale = ? AND bookSlug = ? AND deletedAt IS NULL`
    )
    .bind(updatedAt, updatedAt, userId, locale, bookSlug)
    .run()
  return (result.meta.changes ?? 0) > 0
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export async function getPreferencesForUser(
  db: D1Database,
  userId: string
): Promise<UserPreference[]> {
  const { results } = await db
    .prepare(`SELECT * FROM user_preferences WHERE userId = ? ORDER BY key ASC`)
    .bind(userId)
    .all<UserPreference>()
  return results
}

export async function getPreferencesSince(
  db: D1Database,
  userId: string,
  since: string
): Promise<UserPreference[]> {
  const { results } = await db
    .prepare(`SELECT * FROM user_preferences WHERE userId = ? AND updatedAt > ?`)
    .bind(userId, since)
    .all<UserPreference>()
  return results
}

export async function upsertPreference(
  db: D1Database,
  userId: string,
  key: string,
  value: string,
  updatedAt: string
): Promise<UserPreference> {
  await db
    .prepare(
      `INSERT INTO user_preferences (userId, key, value, updatedAt)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(userId, key) DO UPDATE SET
         value = excluded.value,
         updatedAt = excluded.updatedAt
       WHERE excluded.updatedAt >= user_preferences.updatedAt`
    )
    .bind(userId, key, value, updatedAt)
    .run()

  const row = await db
    .prepare(`SELECT * FROM user_preferences WHERE userId = ? AND key = ?`)
    .bind(userId, key)
    .first<UserPreference>()
  if (!row) throw new Error('Preference not found after upsert')
  return row
}
