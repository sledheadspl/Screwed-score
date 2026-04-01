import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analysis Result',
  description: 'View this AI-powered bill and contract analysis. See the SCREWED, MAYBE, or SAFE score and detailed findings.',
  robots: { index: false, follow: false },
}

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
