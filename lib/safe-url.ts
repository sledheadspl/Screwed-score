/**
 * Website and logo fields are user-supplied and rendered as links or image
 * sources. Only plain http(s) URLs are allowed: javascript:, data:, vbscript:
 * and anything else that isn't a web address are rejected.
 */

/** Returns the normalised URL if it is http(s), otherwise null. */
export function toHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 2000) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}

/**
 * For rendering: the URL to put in href/src, or undefined when the stored
 * value isn't a safe http(s) URL (older rows were saved without checks).
 */
export function safeHref(value: string | null | undefined): string | undefined {
  return toHttpUrl(value) ?? undefined
}
