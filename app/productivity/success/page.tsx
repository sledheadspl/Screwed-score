'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Mail, Download } from 'lucide-react'

// Mirror of PRODUCT_CATALOG in lib/email/product-delivery.ts — kept here for
// instant client-side rendering of the download link without a server round-trip.
const PRODUCTS: Record<string, { name: string; download: string }> = {
  'creator-os':               { name: 'Creator OS Bundle',                 download: '/downloads/creator-os-bundle.html' },
  'content-pipeline':         { name: 'Content Pipeline Pro',              download: '/downloads/content-pipeline-pro.html' },
  'brand-deal':               { name: 'Brand Deal Negotiation Pack',       download: '/downloads/brand-deal-negotiation-pack.html' },
  'revenue-dashboard':        { name: 'Revenue Dashboard Kit',             download: '/downloads/revenue-dashboard-kit.html' },
  'social-assets':            { name: 'Social Media Asset Pack',           download: '/downloads/social-media-asset-pack.html' },
  'launch-sequence':          { name: 'Launch Sequence Playbook',          download: '/downloads/launch-sequence-playbook.html' },
  'ai-prompt-vault':          { name: 'AI Prompt Vault for Creators',      download: '/downloads/ai-prompt-vault.html' },
  'youtube-accelerator':      { name: 'YouTube Growth Accelerator',        download: '/downloads/youtube-growth-accelerator.html' },
  'email-list-builder':       { name: 'Email List Builder System',         download: '/downloads/email-list-builder.html' },
  'viral-content-formula':    { name: 'Viral Content Formula',             download: '/downloads/viral-content-formula.html' },
  'freelance-rate-kit':       { name: 'Freelance Rate Masterclass Kit',    download: '/downloads/freelance-rate-kit.html' },
  'personal-brand-kit':       { name: 'Personal Brand Positioning Kit',    download: '/downloads/personal-brand-positioning-kit.html' },
  'creator-legal-toolkit':    { name: 'Creator Legal Toolkit',             download: '/downloads/creator-legal-toolkit.html' },
  'passive-income-blueprint': { name: 'Passive Income Blueprint',          download: '/downloads/passive-income-blueprint.html' },
  'video-script-formula':     { name: 'Video Script & Hook Formula',       download: '/downloads/video-script-formula.html' },
  'course-creator-kit':       { name: 'Digital Course Creator Kit',        download: '/downloads/course-creator-kit.html' },
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

        {/* Instant download — don't make the buyer wait for email */}
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-6 py-4 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #00E5FF, #67e8f9)',
              color: '#080808',
              boxShadow: '0 0 40px rgba(0,229,255,0.25)',
            }}
          >
            <Download className="w-4 h-4" /> Open your download now
          </a>
        )}

        {/* Email notice */}
        <div className="glass-card rounded-2xl p-5 flex items-start gap-4 text-left">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.12)' }}>
            <Mail className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-brand-text">A copy is on the way to your inbox</p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.45)' }}>
              We sent your download link to the email you used at checkout — bookmark it for future access. Check your spam folder if you don&apos;t see it within a few minutes.
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
