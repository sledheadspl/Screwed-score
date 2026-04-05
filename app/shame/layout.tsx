import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wall of Shame — Businesses Rated by Overcharge Score',
  description: 'See which businesses have the highest SCREWED ratings. Community-reported overcharges ranked by category. Find out who\'s been ripping people off.',
  alternates: { canonical: 'https://screwedscore.com/shame' },
  openGraph: {
    title: 'Wall of Shame — Businesses Rated by Overcharge Score',
    description: 'Community-reported overcharges ranked by business. See who\'s been ripping people off.',
    url: 'https://screwedscore.com/shame',
  },
}

export default function ShameLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
