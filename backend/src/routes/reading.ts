import { Hono } from 'hono'
import type { Env, JwtVariables } from '../types/index.js'
import { authMiddleware } from '../middleware/auth.js'
import {
  ensureUser,
  getReadingProgressForUser,
  upsertReadingProgress,
  softDeleteReadingProgress,
} from '../db/queries.js'
import { validateReadingProgressInput } from '../utils/validation.js'
import { nowIso } from '../utils/timestamps.js'

const reading = new Hono<{ Bindings: Env; Variables: JwtVariables }>()

reading.use('*', authMiddleware)

reading.get('/', async (c) => {
  const userId = c.get('userId')
  await ensureUser(c.env.DB, userId)
  const data = await getReadingProgressForUser(c.env.DB, userId)
  return c.json({ data })
})

reading.put('/:locale/:bookSlug', async (c) => {
  const userId = c.get('userId')
  const { locale, bookSlug } = c.req.param()

  if (!['en', 'es'].includes(locale)) {
    return c.json({ error: 'validationFailed', message: 'Invalid locale' }, 400)
  }
  if (!/^[a-z0-9-]+$/.test(bookSlug)) {
    return c.json({ error: 'validationFailed', message: 'Invalid bookSlug' }, 400)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'badRequest', message: 'Invalid JSON body' }, 400)
  }

  const validation = validateReadingProgressInput(body)
  if (!validation.ok) return c.json(validation.error, 400)

  const input = body as {
    id: string
    chapterSlug: string
    scrollContent: number
    scrollLeftSidebar: number
    scrollRightSidebar: number
    updatedAt: string
    deletedAt?: string | null
  }

  await ensureUser(c.env.DB, userId)
  const row = await upsertReadingProgress(c.env.DB, userId, locale, bookSlug, input)
  return c.json(row)
})

reading.delete('/:locale/:bookSlug', async (c) => {
  const userId = c.get('userId')
  const { locale, bookSlug } = c.req.param()

  const deleted = await softDeleteReadingProgress(c.env.DB, userId, locale, bookSlug, nowIso())
  if (!deleted) return c.json({ error: 'notFound', message: 'Reading progress not found' }, 404)
  return new Response(null, { status: 204 })
})

export default reading
