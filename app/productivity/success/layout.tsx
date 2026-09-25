import type { Metadata } from 'next'

// Post-checkout / sign-in screen — no search value, keep it out of the index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
