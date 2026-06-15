export function nowIso(): string {
  return new Date().toISOString()
}

export function isValidIso(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const d = new Date(value)
  return !isNaN(d.getTime())
}
