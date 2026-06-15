import type { ApiError } from '../types/index.js'
import { isValidIso } from './timestamps.js'

type ValidationResult = { ok: true } | { ok: false; error: ApiError }

const LOCALES = ['en', 'es'] as const

export function validateLocale(value: unknown): value is 'en' | 'es' {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

export function validateUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

export function validateSlug(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9-]+$/.test(value) && value.length > 0
}

function field(name: string, issue: string) {
  return { field: name, issue }
}

// ─── Reading progress ─────────────────────────────────────────────────────────

export function validateReadingProgressInput(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: { error: 'badRequest', message: 'Body must be a JSON object' } }
  }
  const b = body as Record<string, unknown>
  const details = []

  if (!validateUuid(b.id)) details.push(field('id', 'must be a valid UUID v4'))
  if (!validateSlug(b.chapterSlug)) details.push(field('chapterSlug', 'required, slug format'))
  if (typeof b.scrollContent !== 'number') details.push(field('scrollContent', 'required number'))
  if (typeof b.scrollLeftSidebar !== 'number') details.push(field('scrollLeftSidebar', 'required number'))
  if (typeof b.scrollRightSidebar !== 'number') details.push(field('scrollRightSidebar', 'required number'))
  if (!isValidIso(b.updatedAt)) details.push(field('updatedAt', 'required ISO 8601 timestamp'))

  if (details.length > 0) {
    return { ok: false, error: { error: 'validationFailed', message: 'Validation failed', details } }
  }
  return { ok: true }
}

// ─── Favorite ─────────────────────────────────────────────────────────────────

export function validateFavoriteInput(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: { error: 'badRequest', message: 'Body must be a JSON object' } }
  }
  const b = body as Record<string, unknown>
  const details = []

  if (!validateUuid(b.id)) details.push(field('id', 'must be a valid UUID v4'))
  if (!validateLocale(b.locale)) details.push(field('locale', 'must be en or es'))
  if (!validateSlug(b.bookSlug)) details.push(field('bookSlug', 'required, slug format'))
  if (!isValidIso(b.updatedAt)) details.push(field('updatedAt', 'required ISO 8601 timestamp'))

  if (details.length > 0) {
    return { ok: false, error: { error: 'validationFailed', message: 'Validation failed', details } }
  }
  return { ok: true }
}

// ─── Recent book ──────────────────────────────────────────────────────────────

export function validateRecentBookInput(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: { error: 'badRequest', message: 'Body must be a JSON object' } }
  }
  const b = body as Record<string, unknown>
  const details = []

  if (!validateUuid(b.id)) details.push(field('id', 'must be a valid UUID v4'))
  if (!validateLocale(b.locale)) details.push(field('locale', 'must be en or es'))
  if (!validateSlug(b.bookSlug)) details.push(field('bookSlug', 'required, slug format'))
  if (typeof b.order !== 'number' || !Number.isInteger(b.order) || b.order < 0) {
    details.push(field('order', 'required non-negative integer'))
  }
  if (!isValidIso(b.updatedAt)) details.push(field('updatedAt', 'required ISO 8601 timestamp'))

  if (details.length > 0) {
    return { ok: false, error: { error: 'validationFailed', message: 'Validation failed', details } }
  }
  return { ok: true }
}

// ─── Preference ───────────────────────────────────────────────────────────────

export function validatePreferenceInput(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: { error: 'badRequest', message: 'Body must be a JSON object' } }
  }
  const b = body as Record<string, unknown>
  const details = []

  if (typeof b.key !== 'string' || b.key.trim().length === 0) details.push(field('key', 'required string'))
  if (typeof b.value !== 'string') details.push(field('value', 'required string'))
  if (!isValidIso(b.updatedAt)) details.push(field('updatedAt', 'required ISO 8601 timestamp'))

  if (details.length > 0) {
    return { ok: false, error: { error: 'validationFailed', message: 'Validation failed', details } }
  }
  return { ok: true }
}

// ─── Batch helpers ────────────────────────────────────────────────────────────

export function validateArray(
  items: unknown,
  validator: (item: unknown) => ValidationResult,
  fieldPrefix: string
): ValidationResult {
  if (!Array.isArray(items)) {
    return {
      ok: false,
      error: { error: 'validationFailed', message: `${fieldPrefix} must be an array` },
    }
  }
  for (let i = 0; i < items.length; i++) {
    const r = validator(items[i])
    if (!r.ok) {
      return {
        ok: false,
        error: {
          ...r.error,
          message: `${fieldPrefix}[${i}]: ${r.error.message}`,
        },
      }
    }
  }
  return { ok: true }
}
