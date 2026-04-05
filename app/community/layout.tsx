import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Community Experiences — Real Stories of Overcharges',
  description: 'Read real community reports of overcharges, hidden fees, and contract red flags. Share your own experience and help others avoid getting screwed.',
  alternates: { canonical: 'https://screwedscore.com/community' },
  openGraph: {
    title: 'Community Experiences — Real Overcharge Reports',
    description: 'Real reports from real people. Share your experience and help others avoid getting screwed.',
    url: 'https://screwedscore.com/community',
  },
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
