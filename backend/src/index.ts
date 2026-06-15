import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types/index.js'
import { errorMiddleware } from './middleware/error.js'
import reading from './routes/reading.js'
import favorites from './routes/favorites.js'
import recent from './routes/recent.js'
import preferences from './routes/preferences.js'
import sync from './routes/sync.js'

const app = new Hono<{ Bindings: Env }>()

app.use(
  '*',
  cors({
    origin: ['https://wordsus.com', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  })
)

app.use('*', errorMiddleware)

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.route('/reading', reading)
app.route('/favorites', favorites)
app.route('/recent', recent)
app.route('/preferences', preferences)
app.route('/sync', sync)

app.notFound((c) => c.json({ error: 'notFound', message: 'Route not found' }, 404))

export default app
