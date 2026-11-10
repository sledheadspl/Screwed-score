import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDES, GUIDE_SLUGS } from '@/lib/guides'

export const metadata: Metadata = {
  title:       'Bill, Invoice and Contract Guides — How to Spot Overcharges | ScrewedScore',
  description: 'Free guides to the red flags hiding in medical bills, mechanic invoices, contractor estimates, leases, car contracts, deposits and more, with a free AI scanner for your own document.',
  alternates:  { canonical: 'https://www.screwedscore.com/analyze' },
  openGraph: {
    title:       'How to spot overcharges on any bill or contract',
    description: 'Free red-flag guides for the bills and contracts people get burned on most.',
    url:         'https://www.screwedscore.com/analyze',
    siteName:    'ScrewedScore',
  },
}

export default function GuidesIndexPage() {
  const itemList = {
    '@context': 'https://schema.org',
    '@type':    'ItemList',
    itemListElement: GUIDE_SLUGS.map((slug, i) => ({
      '@type':  'ListItem',
      position: i + 1,
      name:     GUIDES[slug].h1,
      url:      `https://www.screwedscore.com/analyze/${slug}`,
    })),
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <main className="max-w-4xl mx-auto px-5 py-12 space-y-10">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-black text-brand-text leading-tight">
            Know the red flags before you pay
          </h1>
          <p className="text-base text-brand-sub max-w-2xl leading-relaxed">
            Plain-English guides to the bills and contracts people get burned on most: what to
            look for, how to push back, and what to say. When you have your own document, the
            free scanner checks it for you in about 20 seconds.
          </p>
          <Link href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black"
            style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', color: '#fff' }}>
            Scan my document free →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {GUIDE_SLUGS.map(slug => {
            const g = GUIDES[slug]
            return (
              <Link key={slug} href={`/analyze/${slug}`}
                className="rounded-2xl p-5 space-y-1.5 transition-colors hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h2 className="text-base font-black text-brand-text">{g.cardTitle} →</h2>
                <p className="text-sm text-brand-sub leading-snug">{g.cardSummary}</p>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
