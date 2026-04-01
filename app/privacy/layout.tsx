import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'GetScrewedScore privacy policy. Your documents are processed and discarded. We never store, sell, or share your personal data.',
  alternates: { canonical: 'https://screwedscore.com/privacy' },
  robots: { index: true, follow: false },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
