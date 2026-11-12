import { createHash, timingSafeEqual } from 'crypto'

type HeaderSource = { get(name: string): string | null } | Record<string, string | string[] | undefined>

function header(h: HeaderSource, name: string): string | null {
  if (typeof (h as { get?: unknown }).get === 'function') {
    return (h as { get(n: string): string | null }).get(name)
  }
  const v = (h as Record<string, string | string[] | undefined>)[name]
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

/**
 * Constant-time secret check. Both sides are hashed to SHA-256 first so the
 * buffers are always the same length and the comparison time doesn't depend
 * on how much of the secret the caller guessed right.
 * Returns false when either side is missing or empty.
 */
export function secretMatches(provided: unknown, expected: string | undefined | null): boolean {
  if (typeof provided !== 'string' || !provided || !expected) return false
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

/** True when the request carries the operator secret in X-Operator-Secret. */
export function isOperatorRequest(h: HeaderSource): boolean {
  return secretMatches(header(h, 'x-operator-secret'), process.env.OWNER_ACCESS_SECRET)
}
