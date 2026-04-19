import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Digital Products for Creators — Templates, Systems & Playbooks',
  description: 'Premium digital products for content creators: YouTube growth systems, viral content frameworks, email list builders, AI prompt vaults, and more. Instant download.',
  alternates: { canonical: 'https://screwedscore.com/productivity' },
  openGraph: {
    title: 'Digital Products for Creators — REMbyDesign',
    description: 'Premium templates, systems, and playbooks for content creators. Instant download.',
    url: 'https://screwedscore.com/productivity',
    type: 'website',
  },
}

export default function ProductivityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
