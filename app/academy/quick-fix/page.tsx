import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { LESSON_PAGES, lessonGroups, lessonPath } from '@/lib/academy-previews'

const BASE = 'https://www.screwedscore.com'
const ORANGE = '#ff7a1a'
const COUNT = LESSON_PAGES.length

export const metadata: Metadata = {
  title: `${COUNT} Quick-Fix Guides: DIY Car, Home and Money Fixes | ScrewedScore Academy`,
  description: `Step-by-step guides for the jobs shops overcharge for: oil changes, brakes, running toilets, drains, disputing bills, getting your deposit back and more. Free preview of every guide, from $5.`,
  alternates: { canonical: `${BASE}/academy/quick-fix` },
  openGraph: {
    title: `${COUNT} Quick-Fix Guides from ScrewedScore Academy`,
    description: 'DIY car, home and money fixes that save you the shop fee. Free preview of every guide.',
    url: `${BASE}/academy/quick-fix`,
    type: 'website',
  },
}

export default function QuickFixIndexPage() {
  const groups = lessonGroups()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Quick-Fix Guides',
    numberOfItems: COUNT,
    itemListElement: LESSON_PAGES.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE}${lessonPath(p.lesson)}`,
      name: p.lesson.title,
    })),
  }

  return (
    <main className="min-h-screen bg-brand-bg overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-12">
        <Link href="/academy" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-sub hover:text-brand-text">
          <ArrowLeft className="w-3.5 h-3.5" /> ScrewedScore Academy
        </Link>

        <header className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,154,60,0.85)' }}>
            Quick-Fix Guides · {COUNT} guides
          </p>
          <h1 className="text-3xl sm:text-5xl font-black text-brand-text tracking-tight leading-[1.05]">
            Fix it yourself. Keep the shop fee.
          </h1>
          <p className="text-lg leading-relaxed max-w-2xl" style={{ color: 'rgba(242,242,242,0.6)' }}>
            Step-by-step guides for the car, home and money problems people overpay for most. Every guide has a free
            preview, so you can see exactly what you&apos;re getting.
          </p>
        </header>

        {groups.map(g => (
          <section key={g.id} id={g.id} className="space-y-4 scroll-mt-20">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-brand-text tracking-tight">{g.title}</h2>
              <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)' }}>{g.blurb}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.pages.map(p => (
                <li key={p.slug}>
                  <Link href={lessonPath(p.lesson)}
                    className="glass-card rounded-xl p-4 h-full flex flex-col gap-1.5 transition-all hover:border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,154,60,0.75)' }}>#{p.lesson.num}</span>
                    <span className="font-bold text-sm text-brand-text leading-snug">{p.lesson.title}</span>
                    <span className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.5)' }}>{p.lesson.teaser ?? p.preview.subtitle}</span>
                    <span className="mt-auto pt-2 text-xs font-semibold inline-flex items-center gap-1" style={{ color: ORANGE }}>
                      Free preview · ${p.lesson.price} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
