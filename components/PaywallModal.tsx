'use client'

import { useState } from 'react'
import { X, Zap, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
  onGoogleLogin?: () => void
}

const PERKS = [
  'Unlimited scans for 30 days',
  'All document types — bills, contracts, invoices',
  'Full AI analysis + Fight Back Kit access',
  'Shareable result links forever',
]

export function PaywallModal({ onClose, onGoogleLogin }: Props) {
  const [loading, setLoading] = useState(false)

  const handlePro = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
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
            Unlock 30 days of<br />unlimited scans — <span style={{ color: '#ff6b60' }}>$2.99</span>
          </h2>
          <p className="text-xs text-brand-sub">One-time payment. No subscription. No hidden fees.</p>
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
          ) : 'Unlock Now — $2.99'}
        </button>

        <p className="text-center text-[10px] text-brand-sub/50">
          Secure checkout via Stripe · Instant access · No subscription
        </p>
      </div>
    </div>
  )
}
