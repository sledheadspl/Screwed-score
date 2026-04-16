'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CheckCircle, Download, Mail, Monitor } from 'lucide-react'
import Link from 'next/link'

const PRODUCT_NAMES: Record<string, string> = {
  'clippilot-pro':             'ClipPilot Pro — Monthly',
  'clippilot-pro-yearly':      'ClipPilot Pro — Annual',
  'clippilot-unlimited':       'ClipPilot Unlimited — Monthly',
  'clippilot-unlimited-yearly':'ClipPilot Unlimited — Annual',
}

function SuccessContent() {
  const params = useSearchParams()
  const productId = params?.get('product') ?? ''
  const productName = PRODUCT_NAMES[productId] ?? 'ClipPilot'
  const isClipPilot = productId.startsWith('clippilot')

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-5">

      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] h-[80vh]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,229,255,0.05) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
        <div className="absolute inset-0 noise-bg" />
      </div>

      <div className="relative max-w-md w-full">

        {/* Card */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Accent bar */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg, transparent, #00E5FF, transparent)' }} />

          <div className="p-8 text-center space-y-6">

            {/* Icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{
                background: 'rgba(0,229,255,0.08)',
                border: '1px solid rgba(0,229,255,0.2)',
                boxShadow: '0 0 40px rgba(0,229,255,0.15)',
              }}
            >
              <CheckCircle className="w-8 h-8 text-cyan-400" />
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
                style={{ color: 'rgba(0,229,255,0.6)' }}>
                Purchase Confirmed
              </p>
              <h1 className="text-2xl font-black text-brand-text tracking-tight">
                {isClipPilot ? 'You\'re all set!' : 'Thank you!'}
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.5)' }}>
                {isClipPilot
                  ? <>Your <span className="text-brand-text font-semibold">{productName}</span> license key is on its way. Check your email — it arrives within a minute.</>
                  : <>Your purchase of <span className="text-brand-text font-semibold">{productName}</span> is confirmed. Check your email for your download link.</>
                }
              </p>
            </div>

            {/* Steps (ClipPilot only) */}
            {isClipPilot && (
              <div
                className="rounded-xl p-4 text-left space-y-3"
                style={{
                  background: 'rgba(0,229,255,0.04)',
                  border: '1px solid rgba(0,229,255,0.1)',
                }}
              >
                <p className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'rgba(0,229,255,0.5)' }}>
                  Next steps
                </p>
                {[
                  { icon: Mail, text: 'Check your email for the license key' },
                  { icon: Download, text: 'Download ClipPilot if you haven\'t yet' },
                  { icon: Monitor, text: 'Open Settings → License and paste your key' },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(0,229,255,0.08)' }}
                    >
                      <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(242,242,242,0.65)' }}>{text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-2.5">
              {isClipPilot && (
                <a
                  href="https://github.com/sledheadspl/Screwed-score/releases/download/clippilot-v0.1.1/ClipPilot_0.1.1_x64-setup.exe"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #67e8f9, #00E5FF)' }}
                >
                  <Download className="w-4 h-4" />
                  Download ClipPilot
                </a>
              )}
              <Link
                href="/clippilot"
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border border-brand-border text-brand-sub hover:text-brand-text hover:bg-brand-muted transition-colors"
              >
                Back to ClipPilot
              </Link>
            </div>

            <p className="text-xs" style={{ color: 'rgba(242,242,242,0.2)' }}>
              Didn&apos;t receive an email? Check your spam folder or{' '}
              <a href="mailto:hello@rembydesign.com" className="underline hover:text-brand-text transition-colors">
                contact support
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClipPilotSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
