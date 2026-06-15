import { createMiddleware } from 'hono/factory'

export const errorMiddleware = createMiddleware(async (c, next) => {
  try {
    return await next()
  } catch (err) {
    console.error('[unhandled error]', err)
    return c.json(
      { error: 'internalServerError', message: 'An unexpected error occurred' },
      500
    )
  }
})
