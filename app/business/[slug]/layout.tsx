import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return {
    title: `${name} — Screwed Score & Reviews`,
    description: `See the community-reported overcharge rating for ${name}. Check their SCREWED score, read real customer experiences, and find out if they're overcharging.`,
    alternates: { canonical: `https://screwedscore.com/business/${slug}` },
    openGraph: {
      title: `${name} — Screwed Score`,
      description: `Is ${name} overcharging customers? See their community-reported rating on GetScrewedScore.`,
      url: `https://screwedscore.com/business/${slug}`,
    },
  }
}

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
