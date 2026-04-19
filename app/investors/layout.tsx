import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Investor Overview — REMbyDesign',
  description: 'We\'re building the consumer protection layer for the internet and the AI content stack for creators. Early-stage, bootstrapped, growing. Open to equity partnerships.',
  robots: { index: false, follow: false },
}

export default function InvestorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
