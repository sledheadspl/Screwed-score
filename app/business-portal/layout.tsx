import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Business Portal — Claim Your Business',
  description: 'Find and claim your business on GetScrewedScore, respond to customer reviews, and manage your public profile.',
  alternates: { canonical: 'https://www.screwedscore.com/business-portal' },
}

export default function BusinessPortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
