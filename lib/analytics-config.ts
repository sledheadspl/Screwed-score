// Google tag IDs, in one place. Client-safe.
//
// NEXT_PUBLIC_GA_MEASUREMENT_ID: one or more GA4 measurement IDs, comma-
// separated (e.g. "G-AAA,G-BBB"), or "off" to load no Google tag at all.
// Unset means the two live properties below. NEXT_PUBLIC_* values are baked
// in at build time, so on the VPS they must be passed as Docker build args.

const DEFAULT_GA_IDS = 'G-MZCC8P2NG7,G-23L7FKP8VQ'
const DEFAULT_ADS_ID = 'AW-18056991193'

function ids(raw: string | undefined, fallback: string): string[] {
  const value = (raw ?? fallback).trim()
  if (value.toLowerCase() === 'off') return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

export const GA_MEASUREMENT_IDS = ids(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, DEFAULT_GA_IDS)
export const GOOGLE_ADS_IDS = ids(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID, DEFAULT_ADS_ID)

/** Every ID gtag should be configured with, GA4 first. */
export const GTAG_IDS = [...GA_MEASUREMENT_IDS, ...GOOGLE_ADS_IDS]
