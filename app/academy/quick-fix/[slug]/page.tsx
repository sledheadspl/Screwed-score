import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Download, Gauge, Layers, ListChecks,
  Lock, Mail, ShieldCheck, Lightbulb, Wrench,
} from 'lucide-react'
import { BuyButton } from '@/components/academy/BuyButton'
import { LESSON_PAGES, LESSON_PAGE_BY_SLUG, lessonPath, packFor, relatedLessons, type LessonPreview } from '@/lib/academy-previews'
import type { QuickFixLesson } from '@/lib/quick-fix'

const BASE = 'https://www.screwedscore.com'
const ORANGE = '#ff7a1a'
const MUTED = 'rgba(242,242,242,0.6)'
const BUY_SOLID: React.CSSProperties = { background: 'linear-gradient(135deg, #ff9a3c, #ff6a00)', color: '#0a0a0a', fontWeight: 900 }
const BUY_SOFT: React.CSSProperties = { background: 'rgba(255,122,26,0.12)', color: '#ff9a3c', border: '1px solid rgba(255,122,26,0.35)', fontWeight: 900 }
const BUY_CLASS = 'flex items-center justify-center gap-2 text-sm px-6 py-3 min-h-[48px] rounded-xl transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'

// What the paid guide has beyond the step-by-step, in the order it appears.
const LOCKED_EXTRAS = [
  'Safety notes for this job',
  'Full tools and parts list',
  'Troubleshooting table',
  'When to stop and call a pro',
  'Printable checklist',
]

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return LESSON_PAGES.map(p => ({ slug: p.slug }))
}

/** "A quick-lube shop charges $60 to $120" / "Losing a disputed charge costs the full amount". */
function costLine(lesson: QuickFixLesson, preview: LessonPreview): string {
  const label = lesson.shopLabel ?? preview.save[0]?.label ?? 'A shop charges'
  const value = /^[A-Z][a-z ]/.test(lesson.shopPrice) ? lesson.shopPrice[0].toLowerCase() + lesson.shopPrice.slice(1) : lesson.shopPrice
  return `${label} ${value}`
}

function metaDescription(lesson: QuickFixLesson, preview: LessonPreview): string {
  const full = `${preview.subtitle} ${costLine(lesson, preview)}. This guide: $${lesson.price}.`
  return full.length <= 170 ? full : preview.subtitle
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = LESSON_PAGE_BY_SLUG[slug]
  if (!page) return {}
  const { lesson, preview } = page
  const url = `${BASE}${lessonPath(lesson)}`
  const description = metaDescription(lesson, preview)
  return {
    title: `${lesson.title}: Step-by-Step Guide | ScrewedScore Academy`,
    description,
    alternates: { canonical: url },
    openGraph: { title: lesson.title, description, url, type: 'article', siteName: 'ScrewedScore' },
    twitter: { card: 'summary_large_image', title: lesson.title, description },
  }
}

export default async function QuickFixLessonPage({ params }: Props) {
  const { slug } = await params
  const page = LESSON_PAGE_BY_SLUG[slug]
  if (!page) notFound()

  const { lesson, preview, seriesLabel, seriesHref } = page
  const pack = packFor(lesson)
  const related = relatedLessons(page)
  const url = `${BASE}${lessonPath(lesson)}`
  const stepCount = preview.outline.length
  const buyLabel = `Get the full guide — $${lesson.price}`

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: lesson.title,
      description: preview.subtitle,
      url,
      category: `Quick-Fix guide · ${seriesLabel}`,
      brand: { '@type': 'Brand', name: 'ScrewedScore Academy' },
      offers: {
        '@type': 'Offer',
        price: lesson.price,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Academy', item: `${BASE}/academy` },
        { '@type': 'ListItem', position: 2, name: 'Quick-Fix Guides', item: `${BASE}/academy/quick-fix` },
        { '@type': 'ListItem', position: 3, name: lesson.title, item: url },
      ],
    },
  ]

  return (
    <main className="min-h-screen bg-brand-bg overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-12">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-brand-sub">
          <ArrowLeft className="w-3.5 h-3.5" />
          <Link href="/academy" className="hover:text-brand-text">Academy</Link>
          <span aria-hidden>/</span>
          <Link href="/academy/quick-fix" className="hover:text-brand-text">Quick-Fix Guides</Link>
          <span aria-hidden>/</span>
          <Link href={seriesHref} className="hover:text-brand-text">{seriesLabel}</Link>
        </nav>

        {/* Hero */}
        <header className="space-y-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,154,60,0.85)' }}>
            Quick-Fix #{lesson.num} · {seriesLabel}
          </p>
          <h1 className="text-3xl sm:text-5xl font-black text-brand-text tracking-tight leading-[1.05]">{lesson.title}</h1>
          <p className="text-lg leading-relaxed" style={{ color: MUTED }}>{preview.subtitle}</p>
          <ul className="flex flex-wrap gap-2 text-xs">
            {preview.time && <Pill icon={Clock}>{preview.time}</Pill>}
            {preview.level && <Pill icon={Gauge}>{preview.level}</Pill>}
            <Pill icon={ListChecks}>{stepCount} steps</Pill>
          </ul>

          {preview.save.length > 0 && (
            <dl className="grid grid-cols-2 gap-3">
              {preview.save.map((s, i) => (
                <div key={s.label} className="glass-card rounded-xl p-4">
                  <dt className="text-xs" style={{ color: 'rgba(242,242,242,0.5)' }}>{s.label}</dt>
                  <dd className="font-black text-lg" style={{ color: i === 0 ? 'rgba(242,242,242,0.85)' : '#30d158' }}>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
            <BuyButton productId={lesson.id} label={buyLabel} style={BUY_SOLID} className={BUY_CLASS} />
            <a href="#preview" className="text-sm font-semibold" style={{ color: '#ff9a3c' }}>Read the free preview ↓</a>
          </div>
          <TrustRow />
        </header>

        {/* Intro */}
        <section className="space-y-4">
          <p className="text-base leading-relaxed" style={{ color: 'rgba(242,242,242,0.75)' }}>{preview.intro}</p>
        </section>

        {/* What you'll learn */}
        {preview.learn.length > 0 && (
          <section className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-brand-text">What you&apos;ll learn</h2>
            <ul className="space-y-3">
              {preview.learn.map(item => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.75)' }}>
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#30d158' }} /> {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Outline */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-brand-text tracking-tight">What&apos;s in the guide</h2>
          <ol className="space-y-2">
            {preview.outline.map((step, i) => (
              <li key={step.label} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-xs font-black tabular-nums shrink-0 w-14" style={{ color: ORANGE }}>{step.label}</span>
                <span className="font-semibold text-sm text-brand-text flex-1">{step.title}</span>
                {i === 0
                  ? <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: 'rgba(48,209,88,0.12)', color: '#30d158' }}>Free below</span>
                  : <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(242,242,242,0.35)' }} aria-label="In the full guide" />}
              </li>
            ))}
            {LOCKED_EXTRAS.map(extra => (
              <li key={extra} className="rounded-xl px-4 py-2.5 flex items-center gap-3" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
                <span className="w-14 shrink-0" />
                <span className="text-sm flex-1" style={{ color: 'rgba(242,242,242,0.55)' }}>{extra}</span>
                <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(242,242,242,0.35)' }} aria-label="In the full guide" />
              </li>
            ))}
          </ol>
        </section>

        {/* Free preview: Step 1 in full */}
        <section id="preview" className="scroll-mt-20 space-y-5">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: '#30d158' }}>Free preview</p>
            <h2 className="text-2xl font-black text-brand-text tracking-tight">
              {preview.firstStep.label}: {preview.firstStep.title}
            </h2>
          </div>
          <ol className="space-y-3 list-decimal pl-5 marker:font-black marker:text-[#ff7a1a]">
            {preview.firstStep.items.map(item => (
              <li key={item} className="pl-1 text-[15px] leading-relaxed" style={{ color: 'rgba(242,242,242,0.8)' }}>{item}</li>
            ))}
          </ol>
          {preview.firstStep.notes.map(note => {
            const warn = note.kind === 'warn'
            const Icon = warn ? AlertTriangle : Lightbulb
            return (
              <div key={note.text} className="rounded-xl p-4 flex gap-3 text-sm leading-relaxed"
                style={warn
                  ? { background: 'rgba(255,69,58,0.07)', border: '1px solid rgba(255,69,58,0.25)', color: 'rgba(242,242,242,0.8)' }
                  : { background: 'rgba(255,214,10,0.06)', border: '1px solid rgba(255,214,10,0.2)', color: 'rgba(242,242,242,0.8)' }}>
                <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: warn ? '#ff453a' : '#ffd60a' }} />
                <p>{note.text}</p>
              </div>
            )
          })}
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.4)' }}>
            General educational information. Read the full guide&apos;s safety notes before you start, follow your
            manufacturer&apos;s instructions and local codes, and call a qualified pro if you&apos;re unsure.
          </p>
        </section>

        {/* Paywall CTA */}
        <section className="rounded-2xl p-6 sm:p-8 space-y-6"
          style={{ background: 'linear-gradient(135deg, rgba(255,122,26,0.14), rgba(255,122,26,0.03))', border: `1px solid rgba(255,122,26,0.4)` }}>
          <div className="space-y-2">
            <p className="font-black text-xl text-brand-text">
              {stepCount > 1 ? `Get Steps 2–${stepCount}, troubleshooting and the checklist` : 'Get the full guide'}
            </p>
            <p className="text-sm" style={{ color: MUTED }}>
              The whole job, start to finish, with the safety notes, parts list and a printable checklist.
              {' '}{costLine(lesson, preview)}. This guide is ${lesson.price}.
            </p>
          </div>
          <BuyButton productId={lesson.id} label={buyLabel} style={BUY_SOLID} className={BUY_CLASS} />
          {pack && (
            <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Layers className="w-5 h-5 mt-0.5 shrink-0" style={{ color: ORANGE }} />
                <div>
                  <p className="font-bold text-brand-text">{pack.title}: {pack.includes.length} guides for ${pack.price}</p>
                  {pack.subtitle && <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)' }}>{pack.subtitle}</p>}
                </div>
              </div>
              <BuyButton productId={pack.id} label={`Get all ${pack.includes.length} — $${pack.price}`} style={BUY_SOFT} className={BUY_CLASS} />
            </div>
          )}
          <TrustRow />
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-black text-brand-text">More {seriesLabel} guides</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map(r => (
                <Link key={r.slug} href={lessonPath(r.lesson)}
                  className="glass-card rounded-xl p-4 space-y-1 block transition-all hover:border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,154,60,0.75)' }}>#{r.lesson.num}</p>
                  <p className="font-bold text-sm text-brand-text leading-snug">{r.lesson.title}</p>
                  <p className="text-xs" style={{ color: 'rgba(242,242,242,0.45)' }}>Free preview · ${r.lesson.price}</p>
                </Link>
              ))}
            </div>
            <Link href="/academy/quick-fix" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: ORANGE }}>
              All Quick-Fix guides <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        )}
      </article>
    </main>
  )
}

function Pill({ icon: Icon, children }: { icon: typeof Wrench; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,242,242,0.75)' }}>
      <Icon className="w-3.5 h-3.5" style={{ color: ORANGE }} /> {children}
    </li>
  )
}

function TrustRow() {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: 'rgba(242,242,242,0.5)' }}>
      <li className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Instant access</li>
      <li className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> A copy by email</li>
      <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Secure checkout by Stripe</li>
    </ul>
  )
}
