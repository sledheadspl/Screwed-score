import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'State of Screwing — Weekly Consumer Overcharge Report | GetScrewedScore',
  description: 'How many people got overcharged this week, which industries are worst, and how much money was flagged. Updated weekly from real document analysis.',
  alternates: { canonical: 'https://screwedscore.com/weekly' },
  openGraph: {
    title: 'State of Screwing — Weekly Consumer Overcharge Report',
    description: 'How many people got overcharged this week, which industries are worst, and how much money was flagged.',
    url: 'https://screwedscore.com/weekly',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'State of Screwing — Weekly Consumer Overcharge Report',
    description: 'How many people got overcharged this week, which industries are worst, and how much money was flagged.',
  },
}

export default function WeeklyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
