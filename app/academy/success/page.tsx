'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Mail, Download } from 'lucide-react'

// Mirror of the academy entries in PRODUCT_CATALOG (lib/email/product-delivery.ts) —
// kept here for instant client-side rendering of the download link without a
// server round-trip.
const PRODUCTS: Record<string, { name: string; download: string }> = {
  'academy-estimate-mastery': { name: 'Repair Estimate Mastery', download: '/downloads/academy-estimate-mastery.html' },
  'academy-check-engine':     { name: 'Check Engine Light: Complete Diagnostic Course', download: '/downloads/academy-check-engine.html' },
  'academy-noise-diagnosis':  { name: 'Car Noise Diagnosis: Complete Course', download: '/downloads/academy-noise-diagnosis.html' },
  'academy-fight-back':       { name: 'Fight Back: Complete Dispute & Consumer Protection Course', download: '/downloads/academy-fight-back.html' },
  'academy-bundle':           { name: 'ScrewedScore Academy — Complete Bundle', download: '/downloads/academy-bundle.html' },
}

function SuccessInner() {
  const params = useSearchParams()
  const productId = params?.get('product') ?? ''
  const product = PRODUCTS[productId]
  const productName = product?.name ?? 'Your purchase'
  const downloadUrl = product?.download

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-5 overflow-x-hidden">

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]"
          style={{ background: 'radial-gradient(ellipse, rgba(255,214,10,0.08) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-50" />
      </div>

      <div className="relative z-10 text-center max-w-md space-y-8 animate-fade-up">

        {/* Check icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,214,10,0.1)',
              border: '1px solid rgba(255,214,10,0.3)',
              boxShadow: '0 0 60px rgba(255,214,10,0.18)',
            }}>
            <CheckCircle className="w-10 h-10" style={{ color: '#ffd60a' }} />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
            style={{ color: 'rgba(255,214,10,0.7)' }}>
            Purchase Confirmed
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
            You&apos;re enrolled.
          </h1>
          <p className="text-brand-sub/60 text-base leading-relaxed">
            <span className="text-brand-text/80 font-semibold">{productName}</span> has been unlocked.
          </p>
        </div>

        {/* Instant download — don't make the buyer wait for email */}
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #ffe066, #ffd60a)',
              color: '#0a0a0a',
              boxShadow: '0 0 40px rgba(255,214,10,0.28)',
            }}
          >
            <Download className="w-4 h-4" /> Open your course now
          </a>
        )}

        {/* Email notice */}
        <div className="glass-card rounded-2xl p-5 flex items-start gap-4 text-left">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.18)' }}>
            <Mail className="w-4 h-4" style={{ color: '#ffd60a' }} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-brand-text">A copy is on the way to your inbox</p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.45)' }}>
              We sent your course link to the email you used at checkout — bookmark it for future access. Check your spam folder if you don&apos;t see it within a few minutes.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/academy"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, rgba(255,214,10,0.15), rgba(255,214,10,0.05))',
              border: '1px solid rgba(255,214,10,0.28)',
              color: '#ffd60a',
            }}>
            Browse More Courses <ArrowRight className="w-4 h-4" />
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

export default function AcademySuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
      </div>
    }>
      <SuccessInner />
    </Suspense>
  )
}
