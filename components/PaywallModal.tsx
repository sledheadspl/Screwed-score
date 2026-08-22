'use client'

import { useState } from 'react'
import { X, Zap, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
}

const PERKS = [
  'Unlimited scans — bills, contracts, invoices',
  'Full AI analysis on every document type',
  'Fight Back Kit access',
  'Shareable result links forever',
]

type Plan = 'monthly' | 'yearly' | 'pass'

const PLANS: { id: Plan; label: string; price: string; note: string; badge?: string }[] = [
  { id: 'yearly',  label: 'Yearly',      price: '$49/yr',   note: '≈ $4.08/mo', badge: 'Save 41%' },
  { id: 'monthly', label: 'Monthly',     price: '$6.99/mo', note: 'Cancel anytime' },
  { id: 'pass',    label: '30-day pass', price: '$2.99',    note: 'One-time, no subscription' },
]

export function PaywallModal({ onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<Plan>('yearly')

  const handlePro = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan === 'pass' ? {} : { plan }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="relative w-full max-w-sm rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-5 animate-fade-up"
        style={{ boxShadow: '0 0 60px rgba(255,59,48,0.15), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 text-brand-sub hover:text-brand-text transition-colors">
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Free scans used up</span>
          </div>
          <h2 className="text-xl font-black text-brand-text leading-tight">
            Go <span style={{ color: '#ff6b60' }}>Pro</span> — unlimited scans
          </h2>
        </div>

        {/* Plan picker */}
        <div className="space-y-2">
          {PLANS.map(p => (
            <button key={p.id} onClick={() => setPlan(p.id)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all"
              style={{
                borderColor: plan === p.id ? 'rgba(255,59,48,0.6)' : 'rgba(255,255,255,0.08)',
                background:  plan === p.id ? 'rgba(255,59,48,0.08)' : 'rgba(255,255,255,0.02)',
              }}>
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 shrink-0"
                  style={{
                    borderColor: plan === p.id ? '#ff3b30' : 'rgba(255,255,255,0.25)',
                    background:  plan === p.id ? '#ff3b30' : 'transparent',
                  }} />
                <span>
                  <span className="text-sm font-bold text-brand-text">{p.label}</span>
                  {p.badge && (
                    <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/25">
                      {p.badge}
                    </span>
                  )}
                  <span className="block text-[11px] text-brand-sub">{p.note}</span>
                </span>
              </span>
              <span className="text-sm font-black text-brand-text">{p.price}</span>
            </button>
          ))}
        </div>

        {/* Perks */}
        <ul className="space-y-2">
          {PERKS.map(p => (
            <li key={p} className="flex items-center gap-2.5 text-sm text-brand-sub">
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
              {p}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button onClick={handlePro} disabled={loading}
          className="w-full py-3 rounded-xl font-black text-sm text-white transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Redirecting…
            </span>
          ) : plan === 'pass' ? 'Unlock 30 days — $2.99' : plan === 'monthly' ? 'Go Pro — $6.99/mo' : 'Go Pro — $49/yr'}
        </button>

        <p className="text-center text-[10px] text-brand-sub/60">
          Secure checkout via Stripe · Instant access · Cancel anytime
        </p>
      </div>
    </div>
  )
}
