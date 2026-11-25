// Quick-Fix Series 2–6: types for the generated catalog.
//
// The data itself lives in lib/academy-series.generated.ts, written by
// scripts/academy/build_lessons.py from scripts/academy/series_*.py (lesson
// content) and scripts/academy/prices.json (live Stripe price IDs).
// lib/quick-fix.ts merges it into the Quick-Fix catalog, so checkout, gated
// downloads, delivery email and the success page handle it like Series 1.
// Client-safe: no server imports.

export type SeriesCategory = 'car' | 'home' | 'money' | 'collector'

export interface AcademySeries {
  id: string
  label: string
  title: string
  blurb: string
  category: SeriesCategory
}

export interface SeriesLesson {
  id: string
  num: string
  title: string
  teaser: string
  series: string
  category: SeriesCategory
  priceId: string
  price: number
  /** What the alternative costs, e.g. "$60 to $120". */
  shopPrice: string
  /** Label for shopPrice, e.g. "A quick-lube shop charges". */
  shopLabel: string
  file: string
}

export interface SeriesPack {
  id: string
  series?: string
  title: string
  subtitle?: string
  priceId: string
  price: number
  includes: string[]
}
