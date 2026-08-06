'use client'

import { useState } from 'react'
import { Zap, CheckCircle, Loader2, ShieldCheck } from 'lucide-react'

const PERKS = [
  'Unlimited AI scans — bills, contracts, invoices, estimates',
  'Every document type, all 12 languages',
  'Fight Back Kit access on flagged documents',
  'Shareable result links that never expire',
  'Priority processing',
]

type Plan = 'monthly' | 'yearly' | 'pass'

const PLANS: {
  id: Plan
  name: string
  price: string
  per: string
  note: string
  badge?: string
  featured?: boolean
}[] = [
  { id: 'monthly', name: 'Monthly', price: '$6.99', per: '/month', note: 'Cancel anytime' },
  { id: 'yearly',  name: 'Yearly',  price: '$49',   per: '/year',  note: '≈ $4.08/mo — cancel anytime', badge: 'Save 41%', featured: true },
  { id: 'pass',    name: '30-Day Pass', price: '$2.99', per: 'one-time', note: 'No subscription. Just 30 days.' },
]

export default function ProPage() {
  const [loading, setLoading] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkout = async (plan: Plan) => {
    setLoading(plan)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan === 'pass' ? {} : { plan }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — try again.')
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen">
      <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-10 text-center">
        <p className="text-[11px] font-bold text-brand-sub/55 uppercase tracking-[0.25em] mb-4">ScrewedScore Pro</p>
        <h1 className="font-black tracking-tighter text-brand-text" style={{ fontSize: 'clamp(36px, 7vw, 64px)', lineHeight: 1.02 }}>
          Never pay a bill<br />
          <span style={{
            background: 'linear-gradient(135deg, #ff9080 0%, #ff3b30 60%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>without checking it first.</span>
        </h1>
        <p className="text-brand-sub/90 text-lg mt-6 max-w-xl mx-auto leading-relaxed">
          Unlimited AI scans of every bill, invoice, and contract that crosses your desk.
          The average American overpays $1,300 a year — one caught overcharge pays for Pro many times over.
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-5 sm:px-8 pb-10">
        <div className="grid sm:grid-cols-3 gap-4">
          {PLANS.map(p => (
            <div key={p.id}
              className="relative flex flex-col rounded-2xl border p-6"
              style={{
                borderColor: p.featured ? 'rgba(255,59,48,0.5)' : 'rgba(255,255,255,0.08)',
                background: p.featured ? 'rgba(255,59,48,0.05)' : 'rgba(255,255,255,0.02)',
                boxShadow: p.featured ? '0 0 40px rgba(255,59,48,0.12)' : undefined,
              }}>
              {p.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 whitespace-nowrap">
                  {p.badge}
                </span>
              )}
              <p className="text-sm font-bold text-brand-sub uppercase tracking-wider mb-3">{p.name}</p>
              <p className="mb-1">
                <span className="text-4xl font-black text-brand-text tracking-tight">{p.price}</span>
                <span className="text-sm text-brand-sub ml-1">{p.per}</span>
              </p>
              <p className="text-xs text-brand-sub/80 mb-5">{p.note}</p>
              <button
                onClick={() => checkout(p.id)}
                disabled={loading !== null}
                className="mt-auto w-full py-3 rounded-xl font-black text-sm transition-all disabled:opacity-60 active:scale-95"
                style={p.featured
                  ? { background: 'linear-gradient(135deg, #ff6b60, #ff3b30)', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#f2f2f2' }}>
                {loading === p.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Redirecting…
                  </span>
                ) : p.id === 'pass' ? 'Get the pass' : 'Go Pro'}
              </button>
            </div>
          ))}
        </div>
        {error && <p className="text-center text-sm text-red-400 mt-4">{error}</p>}
      </section>

      <section className="max-w-md mx-auto px-5 sm:px-8 pb-16">
        <ul className="space-y-2.5">
          {PERKS.map(perk => (
            <li key={perk} className="flex items-center gap-2.5 text-sm text-brand-sub">
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> {perk}
            </li>
          ))}
        </ul>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-brand-sub/70 mt-8">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500/70" />
          Secure checkout via Stripe · Instant access · Cancel anytime
        </p>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-brand-sub/70 mt-2">
          <Zap className="w-3.5 h-3.5 text-red-400/70" />
          Every visitor gets 5 free scans a day — Pro removes the limit.
        </p>
      </section>
    </main>
  )
}
