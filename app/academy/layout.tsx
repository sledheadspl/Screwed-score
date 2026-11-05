import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'ScrewedScore Academy — Learn to Never Get Overcharged Again',
  description: 'Full video-and-text courses on reading repair estimates, diagnosing check engine lights, identifying car noises, and fighting back on bad bills and bad charges. Instant download, yours to keep.',
  alternates: { canonical: 'https://www.screwedscore.com/academy' },
  openGraph: {
    title: 'ScrewedScore Academy',
    description: 'Full courses that turn you into your own best advocate — estimates, diagnostics, noises, and disputes.',
    url: 'https://www.screwedscore.com/academy',
    type: 'website',
  },
}

// Hidden until the courses have real Stripe prices (product-checkout still has
// price_REPLACE_ACADEMY_* placeholders, so every Buy button fails). Set
// NEXT_PUBLIC_ACADEMY_ENABLED=true in Netlify to bring it back.
const ACADEMY_ENABLED = process.env.NEXT_PUBLIC_ACADEMY_ENABLED === 'true'

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  if (!ACADEMY_ENABLED) notFound()
  return <>{children}</>
}
