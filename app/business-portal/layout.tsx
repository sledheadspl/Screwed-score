import type { Metadata } from 'next'

// /business-portal is a login-gated vendor management dashboard, not a public
// content page — it redirects unauthenticated visitors to /auth. It should
// never be indexed, and it's been removed from sitemap.ts to stop wasting
// crawl budget on it.
export const metadata: Metadata = {
  title: 'Business Portal',
  robots: {
    index: false,
    follow: false,
  },
}

export default function BusinessPortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
