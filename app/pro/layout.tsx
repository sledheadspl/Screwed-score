import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Go Pro — Unlimited AI Bill & Contract Scans',
  description:
    'ScrewedScore Pro: unlimited AI scans of bills, contracts, and invoices for $6.99/mo or $49/yr. Catch overcharges before you pay them. Cancel anytime.',
  alternates: { canonical: 'https://www.screwedscore.com/pro' },
  openGraph: {
    title: 'ScrewedScore Pro — Unlimited Scans',
    description: 'Unlimited AI overcharge detection for $6.99/mo or $49/yr. Cancel anytime.',
    url: 'https://www.screwedscore.com/pro',
  },
}

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
