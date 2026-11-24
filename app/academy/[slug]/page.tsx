import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, Download, Infinity as InfinityIcon, Layers, ShieldCheck } from 'lucide-react'
import { COURSES, COURSE_BY_SLUG, BUNDLE } from '@/lib/academy'
import { BuyButton } from '@/components/academy/BuyButton'

const BASE = 'https://www.screwedscore.com'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return COURSES.map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const course = COURSE_BY_SLUG[slug]
  if (!course) return {}
  const url = `${BASE}/academy/${course.slug}`
  return {
    title: `${course.title} — ScrewedScore Academy`,
    description: course.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: course.title, description: course.metaDescription, url, type: 'website' },
  }
}

const GOLD = '#ffd60a'
const BUY_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, #ffe066, #ffd60a)',
  color: '#0a0a0a',
  fontWeight: 900,
}
const BUY_CLASS = 'flex items-center gap-2 text-sm px-6 py-3 rounded-xl transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'

export default async function CoursePage({ params }: Props) {
  const { slug } = await params
  const course = COURSE_BY_SLUG[slug]
  if (!course) notFound()

  const Icon = course.icon
  const others = COURSES.filter(c => c.slug !== course.slug)
  const isLegal = course.id === 'academy-fight-back'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.metaDescription,
    provider: { '@type': 'Organization', name: 'ScrewedScore', sameAs: BASE },
    url: `${BASE}/academy/${course.slug}`,
    offers: { '@type': 'Offer', price: course.priceUsd, priceCurrency: 'USD', category: 'Paid', availability: 'https://schema.org/InStock' },
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: `${course.modules.length} modules, self-paced` },
  }

  return (
    <main className="min-h-screen bg-brand-bg overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-20 space-y-14">

        <Link href="/academy" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-sub hover:text-brand-text">
          <ArrowLeft className="w-3.5 h-3.5" /> All Academy courses
        </Link>

        {/* Hero */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.2)' }}>
              <Icon className="w-5 h-5" style={{ color: GOLD }} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,214,10,0.75)' }}>
              ScrewedScore Academy · {course.modules.length} modules
            </span>
            {course.badge && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,214,10,0.15)', color: GOLD, border: '1px solid rgba(255,214,10,0.3)' }}>
                {course.badge}
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-brand-text tracking-tight leading-[1.05]">{course.title}</h1>
          <p className="text-lg leading-relaxed max-w-2xl" style={{ color: 'rgba(242,242,242,0.6)' }}>{course.subtitle}</p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-2">
            <span className="text-4xl font-black text-brand-text">{course.price}</span>
            <BuyButton productId={course.id} label={`Get the course — ${course.price}`} style={BUY_STYLE} className={BUY_CLASS} />
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: 'rgba(242,242,242,0.5)' }}>
            <li className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Instant download</li>
            <li className="flex items-center gap-1.5"><InfinityIcon className="w-3.5 h-3.5" /> Yours to keep, no subscription</li>
            <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Secure checkout by Stripe</li>
          </ul>
        </section>

        {/* Who it's for / what you'll be able to do */}
        <section className="grid gap-5 sm:grid-cols-2">
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-brand-text">This is for you if</h2>
            <ul className="space-y-3">
              {course.whoFor.map(item => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.7)' }}>
                  <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GOLD }} /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-brand-text">You&apos;ll be able to</h2>
            <ul className="space-y-3">
              {course.outcomes.map(item => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.7)' }}>
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#30d158' }} /> {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Modules */}
        <section className="space-y-5">
          <h2 className="text-2xl font-black text-brand-text tracking-tight">What&apos;s inside</h2>
          <ol className="space-y-3">
            {course.modules.map((m, i) => (
              <li key={m.title} className="glass-card rounded-xl p-5 flex gap-4">
                <span className="text-sm font-black tabular-nums shrink-0 w-7" style={{ color: GOLD }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-bold text-brand-text">{m.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.55)' }}>{m.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Buy again + bundle */}
        <section className="glass-card rounded-2xl p-6 sm:p-8 space-y-6" style={{ border: '1px solid rgba(255,214,10,0.2)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1">
              <p className="font-black text-xl text-brand-text">{course.title}</p>
              <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)' }}>
                {course.modules.length} modules · instant download · yours to keep
              </p>
            </div>
            <BuyButton productId={course.id} label={`Get it — ${course.price}`} style={BUY_STYLE} className={BUY_CLASS} />
          </div>
          <div className="border-t border-brand-border/30 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-3">
              <Layers className="w-5 h-5 mt-0.5 shrink-0" style={{ color: GOLD }} />
              <div className="space-y-1">
                <p className="font-bold text-brand-text">Or get all 4 courses — 28 modules</p>
                <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)' }}>
                  <span className="line-through opacity-60">${BUNDLE.fullPriceUsd}</span> {BUNDLE.price} for the complete Academy bundle.
                </p>
              </div>
            </div>
            <BuyButton productId={BUNDLE.id} label={`Get the bundle — ${BUNDLE.price}`}
              style={{ background: 'rgba(255,214,10,0.1)', color: GOLD, border: '1px solid rgba(255,214,10,0.3)' }}
              className={BUY_CLASS} />
          </div>
        </section>

        {isLegal && (
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.4)' }}>
            This course is general information for educational purposes, not legal advice. Laws differ by state and by
            situation; for a serious or high-dollar dispute, talk to a licensed attorney or your state attorney general&apos;s office.
          </p>
        )}

        {/* Other courses */}
        <section className="space-y-5">
          <h2 className="text-lg font-black text-brand-text">More from the Academy</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {others.map(o => {
              const OIcon = o.icon
              return (
                <Link key={o.slug} href={`/academy/${o.slug}`}
                  className="glass-card rounded-xl p-5 space-y-2 transition-all hover:border-white/10 block">
                  <OIcon className="w-4 h-4" style={{ color: GOLD }} />
                  <p className="font-bold text-sm text-brand-text leading-snug">{o.title}</p>
                  <p className="text-xs" style={{ color: 'rgba(242,242,242,0.45)' }}>{o.price} · {o.modules.length} modules</p>
                </Link>
              )
            })}
          </div>
          <Link href="/academy#quick-fix" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#ff7a1a' }}>
            Quick-Fix repair guides from $9 <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </main>
  )
}
