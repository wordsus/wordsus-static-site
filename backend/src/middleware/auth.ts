import { createMiddleware } from 'hono/factory'
import type { Env, JwtVariables } from '../types/index.js'

// ─── In-memory JWKS cache ─────────────────────────────────────────────────────

interface JwksCacheEntry {
  keys: JsonWebKey[]
  fetchedAt: number
}

let jwksCache: JwksCacheEntry | null = null
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

async function getJwks(jwksUrl: string): Promise<JsonWebKey[]> {
  const now = Date.now()
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys
  }
  const res = await fetch(jwksUrl)
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`)
  const { keys } = (await res.json()) as { keys: JsonWebKey[] }
  jwksCache = { keys, fetchedAt: now }
  return keys
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

function base64UrlDecode(input: string): ArrayBuffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (padded.length % 4)) % 4
  const b64 = padded + '='.repeat(pad)
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

function decodeHeader(token: string): Record<string, unknown> {
  const [headerB64] = token.split('.')
  const json = new TextDecoder().decode(base64UrlDecode(headerB64))
  return JSON.parse(json)
}

function decodePayload(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT structure')
  const json = new TextDecoder().decode(base64UrlDecode(parts[1]))
  return JSON.parse(json)
}

// ─── ES256 verification via JWKS ──────────────────────────────────────────────

async function verifyEs256(token: string, jwksUrl: string): Promise<Record<string, unknown>> {
  const header = decodeHeader(token)
  const keys = await getJwks(jwksUrl)

  const jwk = keys.find(
    (k) => k.kty === 'EC' && (header.kid === undefined || (k as unknown as Record<string, unknown>).kid === header.kid)
  )
  if (!jwk) throw new Error('No matching EC key in JWKS')

  const [headerB64, payloadB64, sigB64] = token.split('.')
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const signature = base64UrlDecode(sigB64)

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  )

  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    cryptoKey,
    signature,
    signingInput
  )
  if (!valid) throw new Error('ES256 signature invalid')

  const payload = decodePayload(token)

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp === 'number' && payload.exp < now) throw new Error('Token expired')
  if (typeof payload.nbf === 'number' && payload.nbf > now) throw new Error('Token not yet valid')

  return payload
}

// ─── HS256 verification ───────────────────────────────────────────────────────

async function verifyHs256(token: string, secret: string): Promise<Record<string, unknown>> {
  const [headerB64, payloadB64, sigB64] = token.split('.')
  if (!headerB64 || !payloadB64 || !sigB64) throw new Error('Invalid JWT structure')

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const expectedSig = base64UrlDecode(sigB64)

  const keyData = new TextEncoder().encode(secret)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['verify']
  )

  const valid = await crypto.subtle.verify('HMAC', cryptoKey, expectedSig, signingInput)
  if (!valid) throw new Error('HS256 signature invalid')

  const payload = decodePayload(token)

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp === 'number' && payload.exp < now) throw new Error('Token expired')
  if (typeof payload.nbf === 'number' && payload.nbf > now) throw new Error('Token not yet valid')

  return payload
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: JwtVariables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'unauthorized', message: 'Missing Bearer token' }, 401)
    }
    const token = authHeader.slice(7)

    let header: Record<string, unknown>
    try {
      header = decodeHeader(token)
    } catch {
      return c.json({ error: 'invalidToken', message: 'Malformed JWT' }, 401)
    }

    const alg = header.alg as string | undefined

    try {
      let payload: Record<string, unknown>

      if (alg === 'ES256') {
        const jwksUrl = c.env.SUPABASE_JWKS_URL
        if (!jwksUrl) {
          return c.json(
            { error: 'serverMisconfiguration', message: 'SUPABASE_JWKS_URL is not set' },
            500
          )
        }
        payload = await verifyEs256(token, jwksUrl)
      } else if (alg === 'HS256' || alg === undefined) {
        const secret = c.env.SUPABASE_JWT_SECRET
        if (!secret) {
          return c.json(
            { error: 'serverMisconfiguration', message: 'SUPABASE_JWT_SECRET is not set' },
            500
          )
        }
        payload = await verifyHs256(token, secret)
      } else {
        return c.json({ error: 'invalidToken', message: `Unsupported algorithm: ${alg}` }, 401)
      }

      const sub = payload.sub
      if (typeof sub !== 'string' || sub.trim() === '') {
        return c.json({ error: 'invalidToken', message: 'JWT is missing sub claim' }, 401)
      }
      c.set('userId', sub)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token verification failed'
      return c.json({ error: 'invalidToken', message }, 401)
    }

    return await next()
  }
)
