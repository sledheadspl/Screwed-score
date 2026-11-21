// Quick-Fix Series 1: ten single-repair guides plus three bundles.
//
// One source of truth for the /academy cards, the success page, checkout
// (pages/api/product-checkout) and email delivery (lib/email/product-delivery).
// Client-safe: no server imports.
//
// Stripe products carry the same ids in metadata.academy_id.

export type QuickFixCategory = 'car' | 'home'

export interface QuickFixLesson {
  id: string
  num: string
  title: string
  category: QuickFixCategory
  priceId: string
  price: number
  /** Rough typical shop / tradesperson charge for the same job, in USD. */
  shopPrice: number
  /** Filename in public/downloads/. */
  file: string
}

export interface QuickFixBundle {
  id: string
  title: string
  subtitle: string
  priceId: string
  price: number
  includes: string[]
  highlight?: boolean
}

export const QF_LESSONS: QuickFixLesson[] = [
  { id: 'qf-no-start-diagnosis', num: '01', title: "Car Won't Start? The 10-Minute Diagnosis", category: 'car', priceId: 'price_1UeK4QEKDzEsz6UjognEMCWZ', price: 9,  shopPrice: 150, file: 'academy-qf-01-no-start-diagnosis.html' },
  { id: 'qf-serpentine-belt',    num: '02', title: 'Replace Your Serpentine Belt',               category: 'car', priceId: 'price_1UeK4WEKDzEsz6UjQtv49ddn', price: 9,  shopPrice: 175, file: 'academy-qf-02-serpentine-belt.html' },
  { id: 'qf-brake-pads-rotors',  num: '03', title: 'Front Brake Pads and Rotors',                category: 'car', priceId: 'price_1UeK4XEKDzEsz6Ujci39Dckt', price: 12, shopPrice: 450, file: 'academy-qf-03-brake-pads-rotors.html' },
  { id: 'qf-coolant-leak',       num: '04', title: 'Find and Fix a Coolant Leak',                category: 'car', priceId: 'price_1UeK4YEKDzEsz6Uj755JLGFf', price: 9,  shopPrice: 250, file: 'academy-qf-04-coolant-leak.html' },
  { id: 'qf-battery-charging',   num: '05', title: 'Battery and Charging System: Test and Replace', category: 'car', priceId: 'price_1UeK4ZEKDzEsz6Uj0Qsj79vV', price: 9,  shopPrice: 200, file: 'academy-qf-05-battery-charging.html' },
  { id: 'qf-running-toilet',     num: '06', title: 'Fix a Running Toilet for Good',              category: 'home', priceId: 'price_1UeK4aEKDzEsz6UjEdogNdDb', price: 9, shopPrice: 175, file: 'academy-qf-06-running-toilet.html' },
  { id: 'qf-unclog-drain',       num: '07', title: 'Unclog Any Drain Without Chemicals',         category: 'home', priceId: 'price_1UeK4bEKDzEsz6UjZcEInCP4', price: 9, shopPrice: 200, file: 'academy-qf-07-unclog-drain.html' },
  { id: 'qf-gfci-outlet',        num: '08', title: 'Replace a GFCI Outlet Safely',               category: 'home', priceId: 'price_1UeK4cEKDzEsz6UjcMioDcbG', price: 9, shopPrice: 180, file: 'academy-qf-08-gfci-outlet.html' },
  { id: 'qf-drywall-patch',      num: '09', title: "Patch Drywall Holes So You Can't See Them",  category: 'home', priceId: 'price_1UeK4dEKDzEsz6UjExusTink', price: 9, shopPrice: 250, file: 'academy-qf-09-drywall-patch.html' },
  { id: 'qf-leaky-faucet',       num: '10', title: 'Fix a Leaky Faucet (Any Type)',              category: 'home', priceId: 'price_1UeK4eEKDzEsz6UjNkyfyAcg', price: 9, shopPrice: 200, file: 'academy-qf-10-leaky-faucet.html' },
]

export const QF_BUNDLES: QuickFixBundle[] = [
  {
    id: 'qf-all-10',
    title: 'All 10 — Best Value',
    subtitle: 'Every car and home guide in Series 1.',
    priceId: 'price_1UeK4gEKDzEsz6UjWvRN3UMA',
    price: 45,
    includes: QF_LESSONS.map(l => l.id),
    highlight: true,
  },
  {
    id: 'qf-car-pack',
    title: 'Car Pack',
    subtitle: 'Guides 1–5: no-start, belt, brakes, coolant, battery.',
    priceId: 'price_1UeK4fEKDzEsz6UjNaY01r1x',
    price: 29,
    includes: QF_LESSONS.filter(l => l.category === 'car').map(l => l.id),
  },
  {
    id: 'qf-home-pack',
    title: 'Home Pack',
    subtitle: 'Guides 6–10: toilet, drains, GFCI, drywall, faucet.',
    priceId: 'price_1UeK4fEKDzEsz6UjuXR66NVf',
    price: 25,
    includes: QF_LESSONS.filter(l => l.category === 'home').map(l => l.id),
  },
]

export const QF_LESSON_BY_ID: Record<string, QuickFixLesson> =
  Object.fromEntries(QF_LESSONS.map(l => [l.id, l]))

export const QF_BUNDLE_BY_ID: Record<string, QuickFixBundle> =
  Object.fromEntries(QF_BUNDLES.map(b => [b.id, b]))

export function isQuickFixProduct(productId: string): boolean {
  return productId in QF_LESSON_BY_ID || productId in QF_BUNDLE_BY_ID
}

export function qfDownloadPath(lesson: QuickFixLesson): string {
  return `/downloads/${lesson.file}`
}

/** Every lesson a Quick-Fix product delivers: one for a single guide, several for a bundle. */
export function qfLessonsFor(productId: string): QuickFixLesson[] {
  const single = QF_LESSON_BY_ID[productId]
  if (single) return [single]
  const bundle = QF_BUNDLE_BY_ID[productId]
  return bundle ? bundle.includes.map(id => QF_LESSON_BY_ID[id]) : []
}

export function qfProductName(productId: string): string | null {
  const single = QF_LESSON_BY_ID[productId]
  if (single) return `Quick-Fix #${single.num}: ${single.title}`
  const bundle = QF_BUNDLE_BY_ID[productId]
  if (bundle) return bundle.id === 'qf-all-10' ? 'Quick-Fix Series 1: All 10 Guides' : `Quick-Fix ${bundle.title}`
  return null
}

export const QF_SAFETY_CONSENT =
  'I have read the safety notice and understand I am responsible for my own work.'
