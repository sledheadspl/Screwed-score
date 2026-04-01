import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'GetScrewedScore terms of service. Review our terms before using the AI bill and contract analysis tool.',
  alternates: { canonical: 'https://screwedscore.com/terms' },
  robots: { index: true, follow: false },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
