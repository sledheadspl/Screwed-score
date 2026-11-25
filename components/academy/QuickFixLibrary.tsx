'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Car, Home, Receipt, Scale, Sparkles, Layers, Loader2, type LucideIcon } from 'lucide-react'
import { QF_SERIES, QF_SERIES_PACKS, QF_EVERYTHING, QF_LESSONS, type QuickFixLesson, type QuickFixBundle } from '@/lib/quick-fix'
import { useCheckout } from '@/components/academy/BuyButton'

// Quick-Fix Series 2–6: fifty $5 guides, a $19 pack per series and one
// everything bundle. Priced for impulse buys; checkout is one tap with
// Apple Pay / Google Pay / Link on Stripe Checkout.

const ORANGE = '#ff7a1a'
const SERIES_ICONS: Record<string, LucideIcon> = {
  'car-care': Car,
  'home-fixes': Home,
  'fight-your-bills': Receipt,
  'your-rights': Scale,
  'pokemon-collector': Sparkles,
}

const lessonsOf = (seriesId: string) => QF_LESSONS.filter(l => l.series === seriesId)
const sellable = (p: { priceId: string }) => Boolean(p.priceId)

function Buy({ productId, label, solid }: { productId: string; label: string; solid?: boolean }) {
  const { loading, error, handleBuy } = useCheckout(productId)
  return (
    <div className="space-y-1">
      <button
        onClick={handleBuy}
        disabled={loading}
        className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-sm font-black transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        style={solid
          ? { background: 'linear-gradient(135deg, #ff9a3c, #ff6a00)', color: '#0a0a0a' }
          : { background: 'rgba(255,122,26,0.12)', color: '#ff9a3c', border: '1px solid rgba(255,122,26,0.35)' }}
      >
        {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Opening checkout…</>) : (<>{label} <ArrowRight className="w-4 h-4" /></>)}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  )
}

function LessonCard({ lesson }: { lesson: QuickFixLesson }) {
  const Icon = SERIES_ICONS[lesson.series ?? ''] ?? Layers
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 mt-1 shrink-0" style={{ color: ORANGE }} />
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,154,60,0.75)' }}>#{lesson.num}</p>
          <Link href={`/academy/quick-fix/${lesson.id.replace(/^qf-/, '')}`} className="block font-bold text-brand-text leading-snug hover:underline underline-offset-2">
            {lesson.title}
          </Link>
          {lesson.teaser && <p className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.5)' }}>{lesson.teaser}</p>}
        </div>
      </div>
      <p className="text-xs mt-auto" style={{ color: 'rgba(242,242,242,0.45)' }}>
        {lesson.shopLabel ?? 'A shop charges'}: <span className="font-semibold text-brand-text/70">{lesson.shopPrice}</span>
      </p>
      <Link href={`/academy/quick-fix/${lesson.id.replace(/^qf-/, '')}`} className="text-xs font-semibold -mt-1" style={{ color: '#ff9a3c' }}>
        Free preview →
      </Link>
      {sellable(lesson)
        ? <Buy productId={lesson.id} label={`Get it — $${lesson.price}`} />
        : <p className="text-xs text-center py-2" style={{ color: 'rgba(242,242,242,0.4)' }}>Coming soon</p>}
    </div>
  )
}

function PackCard({ pack }: { pack: QuickFixBundle }) {
  const separate = pack.includes.reduce((sum, id) => sum + (QF_LESSONS.find(l => l.id === id)?.price ?? 0), 0)
  return (
    <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ background: 'rgba(255,122,26,0.05)', border: '1px solid rgba(255,122,26,0.25)' }}>
      <div className="flex-1 min-w-0">
        <p className="font-black text-brand-text">{pack.title}</p>
        <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)' }}>{pack.subtitle}</p>
        <p className="text-sm mt-1">
          <span className="font-black" style={{ color: ORANGE }}>${pack.price}</span>{' '}
          <span className="line-through" style={{ color: 'rgba(242,242,242,0.35)' }}>${separate}</span>{' '}
          <span className="text-xs font-bold" style={{ color: 'rgba(255,154,60,0.8)' }}>save ${separate - pack.price}</span>
        </p>
      </div>
      <div className="sm:w-56">
        {sellable(pack) ? <Buy productId={pack.id} label={`All ${pack.includes.length} — $${pack.price}`} solid /> : null}
      </div>
    </div>
  )
}

export function QuickFixLibrary() {
  const [active, setActive] = useState<string>('all')
  const shown = active === 'all' ? QF_SERIES : QF_SERIES.filter(s => s.id === active)
  const everythingSeparate = QF_EVERYTHING.includes.length * 5

  return (
    <section id="quick-fix-library" className="scroll-mt-16 max-w-6xl mx-auto px-4 sm:px-8 pb-20 sm:pb-24">
      <div className="text-center space-y-3 mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(255,154,60,0.8)' }}>
          Quick-Fix Library · Series 2–6 · $5 each
        </p>
        <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">A guide for every way you get screwed.</h2>
        <p className="text-sm max-w-lg mx-auto" style={{ color: 'rgba(242,242,242,0.5)' }}>
          Car, home, bills, your rights and Pokémon cards. {QF_EVERYTHING.includes.length} step-by-step guides with
          printable checklists. Instant access, a copy by email, and one-tap checkout.
        </p>
      </div>

      {sellable(QF_EVERYTHING) && (
        <div className="rounded-2xl p-5 sm:p-6 mb-8 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ background: 'linear-gradient(135deg, rgba(255,122,26,0.16), rgba(255,122,26,0.04))', border: `2px solid ${ORANGE}` }}>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: ORANGE }}>Best value</p>
            <p className="font-black text-xl text-brand-text">All {QF_EVERYTHING.includes.length} guides</p>
            <p className="text-sm" style={{ color: 'rgba(242,242,242,0.55)' }}>
              <span className="text-2xl font-black" style={{ color: ORANGE }}>${QF_EVERYTHING.price}</span>{' '}
              <span className="line-through">${everythingSeparate}</span> · less than $1 a guide
            </p>
          </div>
          <div className="sm:w-64"><Buy productId={QF_EVERYTHING.id} label={`Get all ${QF_EVERYTHING.includes.length} — $${QF_EVERYTHING.price}`} solid /></div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center" role="tablist">
        {[{ id: 'all', label: 'All' }, ...QF_SERIES.map(s => ({ id: s.id, label: s.label }))].map(chip => (
          <button key={chip.id} role="tab" aria-selected={active === chip.id} onClick={() => setActive(chip.id)}
            className="shrink-0 text-sm font-bold px-4 py-2 rounded-full transition-all"
            style={active === chip.id
              ? { background: ORANGE, color: '#0a0a0a' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(242,242,242,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {chip.label}
          </button>
        ))}
      </div>

      <div className="space-y-12">
        {shown.map(s => {
          const Icon = SERIES_ICONS[s.id] ?? Layers
          const pack = QF_SERIES_PACKS.find(p => p.series === s.id)
          return (
            <div key={s.id} id={`qf-${s.id}`} className="space-y-4 scroll-mt-20">
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5" style={{ color: ORANGE }} />
                <h3 className="text-xl font-black text-brand-text">{s.label}</h3>
              </div>
              <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)' }}>{s.blurb}</p>
              {pack && <PackCard pack={pack} />}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lessonsOf(s.id).map(l => <LessonCard key={l.id} lesson={l} />)}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
