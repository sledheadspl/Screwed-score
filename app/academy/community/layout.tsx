import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Academy Community — Questions, Wins & Tips | ScrewedScore',
  description: 'Ask questions, share wins, and trade tips with other people working through the ScrewedScore Academy courses on repair estimates, check engine lights, car noises, and consumer disputes.',
  alternates: { canonical: 'https://www.screwedscore.com/academy/community' },
  openGraph: {
    title: 'ScrewedScore Academy Community',
    description: 'Ask questions, share wins, and trade tips with other Academy students.',
    url: 'https://www.screwedscore.com/academy/community',
    type: 'website',
  },
}

export default function AcademyCommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
