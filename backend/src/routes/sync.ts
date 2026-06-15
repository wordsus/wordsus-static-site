import { Hono } from 'hono'
import type { Env, JwtVariables, SyncPushBody, SyncConflict, SyncReadingProgressInput } from '../types/index.js'
import { authMiddleware } from '../middleware/auth.js'
import {
  ensureUser,
  getReadingProgressSince,
  getFavoritesSince,
  getRecentBooksSince,
  getPreferencesSince,
  upsertReadingProgress,
  upsertFavorite,
  upsertRecentBook,
  upsertPreference,
} from '../db/queries.js'
import {
  validateReadingProgressInput,
  validateFavoriteInput,
  validateRecentBookInput,
  validatePreferenceInput,
  validateArray,
} from '../utils/validation.js'
import { nowIso, isValidIso } from '../utils/timestamps.js'

const sync = new Hono<{ Bindings: Env; Variables: JwtVariables }>()

sync.use('*', authMiddleware)

// ─── Pull ─────────────────────────────────────────────────────────────────────

sync.get('/', async (c) => {
  const since = c.req.query('since')
  if (!since || !isValidIso(since)) {
    return c.json(
      { error: 'validationFailed', message: 'Query param "since" must be a valid ISO 8601 timestamp' },
      400
    )
  }

  const userId = c.get('userId')
  await ensureUser(c.env.DB, userId)

  const [readingProgress, favorites, recentBooks, preferences] = await Promise.all([
    getReadingProgressSince(c.env.DB, userId, since),
    getFavoritesSince(c.env.DB, userId, since),
    getRecentBooksSince(c.env.DB, userId, since),
    getPreferencesSince(c.env.DB, userId, since),
  ])

  return c.json({
    readingProgress,
    favorites,
    recentBooks,
    preferences,
    serverTime: nowIso(),
  })
})

// ─── Push ─────────────────────────────────────────────────────────────────────

sync.post('/', async (c) => {
  const userId = c.get('userId')

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'badRequest', message: 'Invalid JSON body' }, 400)
  }

  if (typeof body !== 'object' || body === null) {
    return c.json({ error: 'badRequest', message: 'Body must be a JSON object' }, 400)
  }

  const b = body as SyncPushBody

  // Validate each optional array
  if (b.readingProgress !== undefined) {
    const v = validateArray(b.readingProgress, validateReadingProgressInput, 'readingProgress')
    if (!v.ok) return c.json(v.error, 400)
  }
  if (b.favorites !== undefined) {
    const v = validateArray(b.favorites, validateFavoriteInput, 'favorites')
    if (!v.ok) return c.json(v.error, 400)
  }
  if (b.recentBooks !== undefined) {
    const v = validateArray(b.recentBooks, validateRecentBookInput, 'recentBooks')
    if (!v.ok) return c.json(v.error, 400)
  }
  if (b.preferences !== undefined) {
    const v = validateArray(b.preferences, validatePreferenceInput, 'preferences')
    if (!v.ok) return c.json(v.error, 400)
  }

  await ensureUser(c.env.DB, userId)

  let applied = 0
  const conflicts: SyncConflict[] = []

  // Apply reading progress
  for (const item of (b.readingProgress ?? []) as SyncReadingProgressInput[]) {
    try {
      await upsertReadingProgress(c.env.DB, userId, item.locale, item.bookSlug, {
        id: item.id,
        chapterSlug: item.chapterSlug,
        scrollContent: item.scrollContent,
        scrollLeftSidebar: item.scrollLeftSidebar,
        scrollRightSidebar: item.scrollRightSidebar,
        updatedAt: item.updatedAt,
        deletedAt: item.deletedAt ?? null,
      })
      applied++
    } catch (err) {
      conflicts.push({ type: 'readingProgress', id: item.id, serverVersion: null })
    }
  }

  // Apply favorites
  for (const item of b.favorites ?? []) {
    try {
      await upsertFavorite(c.env.DB, userId, {
        id: item.id,
        locale: item.locale as string,
        bookSlug: item.bookSlug as string,
        updatedAt: item.updatedAt,
        deletedAt: item.deletedAt ?? null,
      })
      applied++
    } catch (err) {
      conflicts.push({ type: 'favorites', id: item.id, serverVersion: null })
    }
  }

  // Apply recent books
  for (const item of b.recentBooks ?? []) {
    try {
      await upsertRecentBook(c.env.DB, userId, {
        id: item.id,
        locale: item.locale as string,
        bookSlug: item.bookSlug as string,
        order: item.order,
        updatedAt: item.updatedAt,
        deletedAt: item.deletedAt ?? null,
      })
      applied++
    } catch (err) {
      conflicts.push({ type: 'recentBooks', id: item.id, serverVersion: null })
    }
  }

  // Apply preferences
  for (const item of b.preferences ?? []) {
    try {
      await upsertPreference(c.env.DB, userId, item.key, item.value, item.updatedAt)
      applied++
    } catch (err) {
      conflicts.push({ type: 'preferences', id: item.key, serverVersion: null })
    }
  }

  return c.json({ applied, conflicts, serverTime: nowIso() })
})

export default sync
