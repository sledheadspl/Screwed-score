// Live audit with a real person — the site's headline paid offer.
// Prices are in cents. Change them here; the page, checkout and emails all
// read from this file.

export type LiveAuditFormat = 'video' | 'in_person'

export const LIVE_AUDIT_AUDITOR = 'Ryan'

// Shown on the page and in emails. Override in Netlify without a code change.
export const LIVE_AUDIT_AREA =
  process.env.NEXT_PUBLIC_LIVE_AUDIT_AREA || 'Spokane & Spokane Valley, WA'

export const LIVE_AUDIT_OPTIONS: Record<LiveAuditFormat, {
  label: string
  priceCents: number
  minutes: number
  summary: string
}> = {
  video: {
    label: 'Video call',
    priceCents: 4900,
    minutes: 45,
    summary: 'Anywhere in the US. Share your screen or hold documents up to the camera.',
  },
  in_person: {
    label: 'In person',
    priceCents: 9900,
    minutes: 60,
    summary: `${LIVE_AUDIT_AREA}. We meet at your home, office, or a coffee shop.`,
  },
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

export function isLiveAuditFormat(value: unknown): value is LiveAuditFormat {
  return value === 'video' || value === 'in_person'
}
