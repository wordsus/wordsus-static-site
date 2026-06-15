import { Hono } from 'hono'
import type { Env, JwtVariables } from '../types/index.js'
import { authMiddleware } from '../middleware/auth.js'
import {
  ensureUser,
  getPreferencesForUser,
  upsertPreference,
} from '../db/queries.js'
import { validatePreferenceInput, validateArray } from '../utils/validation.js'

const preferences = new Hono<{ Bindings: Env; Variables: JwtVariables }>()

preferences.use('*', authMiddleware)

preferences.get('/', async (c) => {
  const userId = c.get('userId')
  await ensureUser(c.env.DB, userId)
  const data = await getPreferencesForUser(c.env.DB, userId)
  return c.json({ data })
})

preferences.put('/', async (c) => {
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
  const validation = validateArray(items, validatePreferenceInput, 'data')
  if (!validation.ok) return c.json(validation.error, 400)

  await ensureUser(c.env.DB, userId)
  const results = await Promise.all(
    items.map((item) => {
      const { key, value, updatedAt } = item as { key: string; value: string; updatedAt: string }
      return upsertPreference(c.env.DB, userId, key, value, updatedAt)
    })
  )
  return c.json({ data: results })
})

export default preferences
