import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Digital Powerhouse Suite™ — Elite Suite',
  description: 'A private, concierge-level digital ecosystem engineered for high-net-worth creators, founders, and investors. Starts at $7,500.',
  openGraph: {
    title: 'The Digital Powerhouse Suite™ — REMbyDesign',
    description: 'Operational dominance for the elite. Private application only.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function EliteSuiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
