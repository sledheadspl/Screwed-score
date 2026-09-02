/**
 * Google AdSense configuration.
 *
 * Set NEXT_PUBLIC_ADSENSE_CLIENT_ID to the publisher ID from the AdSense
 * dashboard (Account → Settings → Account information), e.g.
 * `ca-pub-1234567890123456`. Leaving it unset disables AdSense everywhere:
 * no script tag is injected, ad slots render nothing, and /ads.txt 404s.
 */

const raw = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim()

/** `ca-pub-…` form, used by the AdSense script tag and ad slots. */
export const ADSENSE_CLIENT_ID =
  raw && /^(ca-)?pub-\d{10,}$/.test(raw) ? (raw.startsWith('ca-') ? raw : `ca-${raw}`) : null

/** `pub-…` form, used by ads.txt. */
export const ADSENSE_PUBLISHER_ID = ADSENSE_CLIENT_ID?.replace(/^ca-/, '') ?? null

export const ADSENSE_ENABLED = ADSENSE_CLIENT_ID !== null
