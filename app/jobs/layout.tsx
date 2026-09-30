import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Available Gigs — Job Marketplace | GetScrewedScore',
  description:
    'Browse curated work opportunities for community members — writing, design, outreach, research, dev, video, and admin gigs. Build your reputation with every completed job.',
  alternates: { canonical: 'https://www.screwedscore.com/jobs' },
  openGraph: {
    title: 'Available Gigs — Job Marketplace',
    description:
      'Curated work opportunities for community members. Build your reputation with every completed job.',
    url: 'https://www.screwedscore.com/jobs',
    type: 'website',
  },
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
