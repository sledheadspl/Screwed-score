'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Mail } from 'lucide-react'

const PRODUCT_NAMES: Record<string, string> = {
  'creator-os':       'Creator OS Bundle',
  'content-pipeline': 'Content Pipeline Pro',
  'brand-deal':       'Brand Deal Negotiation Pack',
  'revenue-dashboard':'Revenue Dashboard Kit',
  'social-assets':    'Social Media Asset Pack',
  'launch-sequence':  'Launch Sequence Playbook',
}

function SuccessInner() {
  const params = useSearchParams()
  const productId = params?.get('product') ?? ''
  const productName = PRODUCT_NAMES[productId] ?? 'Your purchase'

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-5 overflow-x-hidden">

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,229,255,0.06) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-50" />
      </div>

      <div className="relative z-10 text-center max-w-md space-y-8 animate-fade-up">

        {/* Check icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(0,229,255,0.08)',
              border: '1px solid rgba(0,229,255,0.25)',
              boxShadow: '0 0 60px rgba(0,229,255,0.15)',
            }}>
            <CheckCircle className="w-10 h-10 text-cyan-400" />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
            style={{ color: 'rgba(0,229,255,0.6)' }}>
            Purchase Confirmed
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
            You&apos;re in.
          </h1>
          <p className="text-brand-sub/60 text-base leading-relaxed">
            <span className="text-brand-text/80 font-semibold">{productName}</span> has been unlocked.
          </p>
        </div>

        {/* Email notice */}
        <div className="glass-card rounded-2xl p-5 flex items-start gap-4 text-left">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.12)' }}>
            <Mail className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-brand-text">Check your email</p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.45)' }}>
              Your download link and access instructions have been sent to the email you used at checkout. Check your spam folder if you don&apos;t see it within a few minutes.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/productivity"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,229,255,0.05))',
              border: '1px solid rgba(0,229,255,0.25)',
              color: '#00E5FF',
            }}>
            Browse More Products <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-brand-sub border border-brand-border hover:bg-brand-muted hover:text-brand-text transition-colors">
            Back to Home
          </Link>
        </div>

      </div>
    </div>
  )
}

export default function ProductSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    }>
      <SuccessInner />
    </Suspense>
  )
}
