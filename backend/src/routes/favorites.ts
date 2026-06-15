import { Hono } from 'hono'
import type { Env, JwtVariables } from '../types/index.js'
import { authMiddleware } from '../middleware/auth.js'
import {
  ensureUser,
  getFavoritesForUser,
  upsertFavorite,
  softDeleteFavorite,
} from '../db/queries.js'
import { validateFavoriteInput } from '../utils/validation.js'
import { nowIso } from '../utils/timestamps.js'

const favorites = new Hono<{ Bindings: Env; Variables: JwtVariables }>()

favorites.use('*', authMiddleware)

favorites.get('/', async (c) => {
  const userId = c.get('userId')
  await ensureUser(c.env.DB, userId)
  const data = await getFavoritesForUser(c.env.DB, userId)
  return c.json({ data })
})

favorites.post('/', async (c) => {
  const userId = c.get('userId')

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'badRequest', message: 'Invalid JSON body' }, 400)
  }

  const validation = validateFavoriteInput(body)
  if (!validation.ok) return c.json(validation.error, 400)

  const input = body as {
    id: string
    locale: string
    bookSlug: string
    updatedAt: string
    deletedAt?: string | null
  }

  await ensureUser(c.env.DB, userId)
  const row = await upsertFavorite(c.env.DB, userId, input)
  return c.json(row, 201)
})

favorites.delete('/:locale/:bookSlug', async (c) => {
  const userId = c.get('userId')
  const { locale, bookSlug } = c.req.param()

  const deleted = await softDeleteFavorite(c.env.DB, userId, locale, bookSlug, nowIso())
  if (!deleted) return c.json({ error: 'notFound', message: 'Favorite not found' }, 404)
  return new Response(null, { status: 204 })
})

export default favorites
