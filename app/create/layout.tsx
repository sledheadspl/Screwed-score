import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Document Creator — Invoices, Contracts, Leases & More',
  description: 'Create professional invoices, job estimates, lease agreements, contracts, demand letters, NDAs, bills of sale, and court paperwork in seconds. Free AI document generator — no account needed.',
  alternates: { canonical: 'https://screwedscore.com/create' },
  keywords: [
    'free invoice generator',
    'free invoice maker',
    'free lease agreement generator',
    'free contract maker',
    'free demand letter generator',
    'free NDA template',
    'free bill of sale',
    'free promissory note',
    'free job estimate template',
    'free small claims court form',
    'AI document creator',
    'professional invoice creator',
    'free rental agreement',
  ],
  openGraph: {
    title: 'Free Document Creator — Invoices, Contracts, Leases & More',
    description: 'AI generates professional invoices, contracts, leases, demand letters, NDAs, and court paperwork in seconds. Free, no account needed.',
    url: 'https://screwedscore.com/create',
    siteName: 'GetScrewedScore',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Document Creator — Invoices, Contracts & More',
    description: 'AI generates professional documents in seconds. Free, no account needed.',
    site: '@screwedscore',
  },
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
