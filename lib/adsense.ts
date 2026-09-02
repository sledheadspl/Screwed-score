/**
 * Google AdSense configuration.
 *
 * The publisher ID is the site's own and is public (it ships in the script
 * URL and in /ads.txt), so it lives here rather than in an env var — that
 * way a deploy can never go out silently un-monetized.
 *
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID overrides it (useful for a second property),
 * and setting that var to `off` disables AdSense entirely: no script tag, no
 * ad slots, and /ads.txt 404s. AdSense is also off outside production builds
 * so local dev never sends traffic to the ad network.
 */

const DEFAULT_CLIENT_ID = 'ca-pub-8697346297594112'

const override = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim()

const configured =
  override === undefined || override === ''
    ? process.env.NODE_ENV === 'production'
      ? DEFAULT_CLIENT_ID
      : null
    : /^(off|false|0|none)$/i.test(override)
      ? null
      : override

/** `ca-pub-…` form, used by the AdSense script tag and ad slots. */
export const ADSENSE_CLIENT_ID =
  configured && /^(ca-)?pub-\d{10,}$/.test(configured)
    ? configured.startsWith('ca-')
      ? configured
      : `ca-${configured}`
    : null

/** `pub-…` form, used by ads.txt. */
export const ADSENSE_PUBLISHER_ID = ADSENSE_CLIENT_ID?.replace(/^ca-/, '') ?? null

export const ADSENSE_ENABLED = ADSENSE_CLIENT_ID !== null
