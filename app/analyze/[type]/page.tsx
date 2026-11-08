import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import { Download } from 'lucide-react'

import { GUIDES, GUIDE_SLUGS, relatedGuides } from '@/lib/guides'


export async function generateStaticParams() {
  return GUIDE_SLUGS.map(type => ({ type }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ type: string }> }
): Promise<Metadata> {
  const { type } = await params
  const c = GUIDES[type]
  if (!c) return { title: 'Not found' }
  return {
    title:       c.metaTitle,
    description: c.metaDescription,
    alternates:  { canonical: `https://www.screwedscore.com/analyze/${type}` },
    openGraph: {
      title:       c.metaTitle,
      description: c.metaDescription,
      url:         `https://www.screwedscore.com/analyze/${type}`,
      siteName:    'ScrewedScore',
    },
  }
}

export default async function AnalyzeLandingPage(
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const c = GUIDES[type]
  if (!c) notFound()

  const faqSchema = {
    '@context':   'https://schema.org',
    '@type':      'FAQPage',
    mainEntity: c.faq.map(({ q, a }) => ({
      '@type':          'Question',
      name:             q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ScrewedScore', item: 'https://www.screwedscore.com' },
      { '@type': 'ListItem', position: 2, name: 'Guides',       item: 'https://www.screwedscore.com/analyze' },
      { '@type': 'ListItem', position: 3, name: c.cardTitle,    item: `https://www.screwedscore.com/analyze/${type}` },
    ],
  }

  return (
    <>
      <Script id="breadcrumb-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="min-h-screen bg-brand-bg">

        {/* Nav */}
        <nav className="sticky top-0 z-50 border-b border-brand-border bg-brand-bg/90 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-0 font-black text-base tracking-tight">
              <span className="text-brand-text">Get</span>
              <span style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Screwed</span>
              <span className="text-brand-text">Score</span>
            </Link>
            <Link href="/" className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
              style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', color: '#fff' }}>
              Scan free →
            </Link>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-5 py-12 space-y-14">

          {/* Hero */}
          <div className="space-y-5">
            <h1 className="text-4xl sm:text-5xl font-black text-brand-text leading-tight">{c.h1}</h1>
            {c.intro.map((p, i) => (
              <p key={i} className="text-base text-brand-sub leading-relaxed max-w-2xl">{p}</p>
            ))}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all"
                style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', color: '#fff' }}>
                {c.ctaText}
              </Link>
              {c.checklistFile && (
              <a href={c.checklistFile} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#f2f2f2' }}>
                <Download className="w-4 h-4" />
                Free Checklist
              </a>
              )}
            </div>
            <p className="text-xs text-brand-sub">{c.ctaSubtext}</p>
          </div>

          {/* Stats */}
          {c.stats && c.stats.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {c.stats.map(({ value, label }) => (
              <div key={label} className="rounded-2xl p-5 text-center space-y-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-2xl font-black text-brand-text" style={{ color: '#ff3b30' }}>{value}</p>
                <p className="text-xs text-brand-sub leading-snug">{label}</p>
              </div>
            ))}
          </div>
          )}

          {/* Red Flags */}
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-brand-text">What to look for</h2>
            <div className="space-y-4">
              {c.redFlags.map(({ flag, detail }) => (
                <div key={flag} className="rounded-2xl p-5 space-y-2"
                  style={{ background: 'rgba(255,59,48,0.04)', border: '1px solid rgba(255,59,48,0.12)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black" style={{ color: '#ff3b30' }}>⚠</span>
                    <h3 className="text-sm font-black text-brand-text">{flag}</h3>
                  </div>
                  <p className="text-sm text-brand-sub leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How To */}
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-brand-text">How to dispute it — step by step</h2>
            <div className="space-y-4">
              {c.howTo.map(({ step, detail }, i) => (
                <div key={step} className="flex gap-4 rounded-2xl p-5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mt-0.5"
                    style={{ background: 'rgba(255,59,48,0.15)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.2)' }}>
                    {i + 1}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-brand-text">{step}</h3>
                    <p className="text-sm text-brand-sub leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mid CTA */}
          <div className="rounded-2xl p-8 text-center space-y-4"
            style={{ background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.15)' }}>
            <h2 className="text-xl font-black text-brand-text">Let the AI find it for you</h2>
            <p className="text-sm text-brand-sub max-w-md mx-auto">Upload your document and get a plain-English breakdown of every suspicious charge in about 20 seconds. Free. No account needed.</p>
            <Link href="/"
              className="inline-block px-8 py-3 rounded-xl font-black text-sm transition-all"
              style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', color: '#fff' }}>
              {c.ctaText}
            </Link>
          </div>

          {/* Download Checklist */}
          {c.checklistFile && (
          <div className="flex items-center justify-between rounded-2xl px-6 py-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <p className="text-sm font-black text-brand-text">{c.checklistLabel}</p>
              <p className="text-xs text-brand-sub mt-0.5">Printable PDF — all red flags + dispute steps on one page</p>
            </div>
            <a href={c.checklistFile} target="_blank" rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-2 ml-4 px-4 py-2.5 rounded-xl text-xs font-black transition-all"
              style={{ background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.25)', color: '#ff6b60' }}>
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>
          )}

          {/* FAQ */}
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-brand-text">Frequently asked questions</h2>
            <div className="space-y-4">
              {c.faq.map(({ q, a }) => (
                <div key={q} className="rounded-2xl p-5 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <h3 className="text-sm font-bold text-brand-text">{q}</h3>
                  <p className="text-sm text-brand-sub leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Related guides */}
          <div className="space-y-5">
            <h2 className="text-2xl font-black text-brand-text">More bills people check</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {relatedGuides(type).map(slug => (
                <Link key={slug} href={`/analyze/${slug}`}
                  className="rounded-2xl p-4 space-y-1 transition-colors hover:bg-white/5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-sm font-black text-brand-text">{GUIDES[slug].cardTitle} →</p>
                  <p className="text-xs text-brand-sub leading-snug">{GUIDES[slug].cardSummary}</p>
                </Link>
              ))}
            </div>
            <Link href="/analyze" className="inline-block text-xs font-bold text-brand-sub hover:text-brand-text">
              See every guide →
            </Link>
          </div>

          {/* Final CTA */}
          <div className="rounded-2xl p-10 text-center space-y-5"
            style={{ background: '#0d0f18', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ff3b30' }}>ScrewedScore</p>
            <h2 className="text-3xl font-black text-brand-text">Get your Screwed Score — free</h2>
            <p className="text-sm text-brand-sub max-w-sm mx-auto">Upload any bill, invoice, or contract. Our AI returns a 0-100 score with every red flag explained in plain English.</p>
            <Link href="/"
              className="inline-block px-10 py-4 rounded-xl font-black text-base transition-all"
              style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', color: '#fff' }}>
              Scan mine free →
            </Link>
            <p className="text-xs text-brand-sub opacity-50">No account. Results in about 20 seconds.</p>
          </div>

        </main>
      </div>
    </>
  )
}
