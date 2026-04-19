'use client'

import { useState } from 'react'
import { X, Zap, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
  onGoogleLogin: () => void
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

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-brand-border" />
          <span className="text-xs text-brand-sub">or</span>
          <div className="flex-1 h-px bg-brand-border" />
        </div>

        {/* Google sign-in */}
        <button onClick={onGoogleLogin}
          className="w-full py-2.5 rounded-xl border border-brand-border bg-brand-muted hover:bg-brand-border transition-colors flex items-center justify-center gap-2 text-sm font-semibold text-brand-text">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google for more free scans
        </button>

        <p className="text-center text-[10px] text-brand-sub/50">
          Signed-in users get 5 free scans/day · Anonymous limit is 3/day
        </p>
      </div>
    </div>
  )
}
