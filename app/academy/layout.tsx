import type { Metadata } from 'next'

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

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
