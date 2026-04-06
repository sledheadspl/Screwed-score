import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Productivity Digital Media',
  description: 'Elite-grade digital assets, automations, and productivity systems engineered to scale your income and eliminate friction.',
  openGraph: {
    title: 'Productivity Digital Media — REMbyDesign',
    description: 'Tools engineered for creators who refuse to operate at average speed.',
    type: 'website',
  },
}

export default function ProductivityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
