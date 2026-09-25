import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Available Gigs',
  description: 'Browse open gigs posted by the GetScrewedScore community and apply in minutes.',
  alternates: { canonical: 'https://www.screwedscore.com/jobs' },
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
