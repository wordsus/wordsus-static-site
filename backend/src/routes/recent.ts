import { Hono } from 'hono'
import type { Env, JwtVariables } from '../types/index.js'
import { authMiddleware } from '../middleware/auth.js'
import {
  ensureUser,
  getRecentBooksForUser,
  upsertRecentBook,
  softDeleteRecentBook,
} from '../db/queries.js'
import { validateRecentBookInput, validateArray } from '../utils/validation.js'
import { nowIso } from '../utils/timestamps.js'

const recent = new Hono<{ Bindings: Env; Variables: JwtVariables }>()

recent.use('*', authMiddleware)

recent.get('/', async (c) => {
  const userId = c.get('userId')
  await ensureUser(c.env.DB, userId)
  const data = await getRecentBooksForUser(c.env.DB, userId)
  return c.json({ data })
})

recent.put('/', async (c) => {
  const userId = c.get('userId')

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'badRequest', message: 'Invalid JSON body' }, 400)
  }

  if (typeof body !== 'object' || body === null || !Array.isArray((body as Record<string, unknown>).data)) {
    return c.json({ error: 'validationFailed', message: 'Body must have a "data" array' }, 400)
  }

  const items = (body as Record<string, unknown>).data as unknown[]
  const validation = validateArray(items, validateRecentBookInput, 'data')
  if (!validation.ok) return c.json(validation.error, 400)

  await ensureUser(c.env.DB, userId)
  const results = await Promise.all(
    items.map((item) =>
      upsertRecentBook(c.env.DB, userId, item as Parameters<typeof upsertRecentBook>[2])
    )
  )
  return c.json({ data: results })
})

recent.delete('/:locale/:bookSlug', async (c) => {
  const userId = c.get('userId')
  const { locale, bookSlug } = c.req.param()

  const deleted = await softDeleteRecentBook(c.env.DB, userId, locale, bookSlug, nowIso())
  if (!deleted) return c.json({ error: 'notFound', message: 'Recent book not found' }, 404)
  return new Response(null, { status: 204 })
})

export default recent
