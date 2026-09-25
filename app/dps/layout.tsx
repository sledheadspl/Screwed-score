import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.screwedscore.com/dps' },
  title: 'Digital Prestige Serve (DPS)',
  description: 'Done-for-you digital branding, content strategy, and system architecture for creators and founders who operate at the highest level.',
  openGraph: {
    title: 'Digital Prestige Serve — REMbyDesign',
    description: 'Bespoke digital strategy and execution for creators, founders, and brands who refuse average.',
    type: 'website',
  },
}

export default function DPSLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
