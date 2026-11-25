// Paid downloads (Academy courses, Quick-Fix guides, creator kits) live in
// private/downloads/, not public/, so they can't be fetched without paying.
// They're served by app/api/download/route.ts, which checks the Stripe
// Checkout Session is paid and that the file belongs to what was bought.
//
// Client-safe: no server imports.

/** Filename part of a catalog path such as "/downloads/academy-bundle.html". */
export function downloadFileName(path: string): string {
  return path.split('/').pop() ?? path
}

/**
 * Link to a paid file for one purchase. `origin` is only needed outside the
 * browser (e.g. in emails); on the site a relative link is enough.
 */
export function paidDownloadUrl(path: string, sessionId: string, origin = ''): string {
  const params = new URLSearchParams({ file: downloadFileName(path), session_id: sessionId })
  return `${origin}/api/download?${params.toString()}`
}
