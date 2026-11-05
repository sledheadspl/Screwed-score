import Link from 'next/link'
import { UserRound, ArrowRight } from 'lucide-react'
import { LIVE_AUDIT_AREA, LIVE_AUDIT_AUDITOR, LIVE_AUDIT_OPTIONS, formatPrice } from '@/lib/live-audit'

const FROM = formatPrice(Math.min(...Object.values(LIVE_AUDIT_OPTIONS).map(o => o.priceCents)))

/** "Talk to a real person" offer: compact button for the hero, card for results. */
export function LiveAuditCTA({ variant = 'card', heading }: { variant?: 'button' | 'card'; heading?: string }) {
  if (variant === 'button') {
    return (
      <Link href="/live-audit"
        className="group w-full flex items-center justify-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/[0.07] px-5 py-4 transition-all hover:bg-red-500/[0.12] hover:border-red-500/70">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
          <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-red-500" />
        </span>
        <span className="text-sm sm:text-base font-black text-brand-text">
          Rather talk to a real person? Book a live audit, from {FROM}
        </span>
        <ArrowRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    )
  }

  return (
    <div className="rounded-2xl p-6 space-y-4 border border-red-500/30"
      style={{ background: 'linear-gradient(135deg, rgba(255,59,48,0.08), rgba(255,59,48,0.02))' }}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/30">
          <UserRound className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="font-black text-brand-text">{heading ?? 'Go through it with a real person'}</h3>
          <p className="text-sm text-brand-sub mt-1 leading-relaxed">
            Sit down with {LIVE_AUDIT_AUDITOR}, in person around {LIVE_AUDIT_AREA} or by video, and review this and your other
            bills line by line. Leave knowing exactly what to dispute and how.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.values(LIVE_AUDIT_OPTIONS).map(o => (
          <span key={o.label} className="rounded-full border border-brand-border bg-black/30 px-3 py-1 text-brand-text/80">
            <strong className="text-brand-text">{formatPrice(o.priceCents)}</strong> {o.label.toLowerCase()} · {o.minutes} min
          </span>
        ))}
      </div>
      <Link href="/live-audit"
        className="w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white hover:opacity-90 transition-opacity"
        style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
        Book a live audit <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
