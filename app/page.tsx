// Server component. Every section below renders to HTML at build time and ships
// zero client JavaScript; the interactive parts are small client islands
// (AnalysisShell, UploadSlot, the Deferred* widgets) mounted inside it.
//
// This file used to be `'use client'` in its entirety, which meant the hero and
// the upload control could not be used until ~900 KB of JS had downloaded,
// parsed and hydrated on the visitor's phone.
import {
  FileText, Sparkles, ShieldCheck, Zap, TrendingUp, ChevronRight,
  Star, ChevronDown, Flame, MessageSquare, Building2,
} from 'lucide-react'
import { AnalysisShell } from '@/components/home/AnalysisShell'
import { UploadSlot, SampleButton } from '@/components/home/UploadSlot'
import {
  DeferredLiveTicker,
  DeferredVictoryBanner,
  DeferredScrewedScoreGame,
} from '@/components/home/Deferred'

// ── Document types ──────────────────────────────────────────────────────────
const DOC_TYPES = [
  { emoji: '🔧', label: 'Mechanic Invoice',    heat: 'high'   },
  { emoji: '🏥', label: 'Medical Bill',         heat: 'high'   },
  { emoji: '📱', label: 'Phone Bill',           heat: 'medium' },
  { emoji: '🏗️', label: 'Contractor Estimate', heat: 'high'   },
  { emoji: '🏠', label: 'Lease Agreement',      heat: 'medium' },
  { emoji: '🦷', label: 'Dental Bill',          heat: 'high'   },
  { emoji: '💼', label: 'Employment Contract',  heat: 'medium' },
  { emoji: '🛡️', label: 'Insurance Quote',     heat: 'medium' },
  { emoji: '📺', label: 'Internet / Cable',     heat: 'medium' },
  { emoji: '🤝', label: 'Brand Deal',           heat: 'medium' },
  { emoji: '📄', label: 'Service Agreement',    heat: 'low'    },
  { emoji: '📸', label: 'Photo / Scan',         heat: 'low'    },
]

// ── Example result cards ────────────────────────────────────────────────────
const EXAMPLES = [
  {
    score: 'SCREWED', emoji: '🚨',
    doc: 'Mechanic Invoice',
    amount: '$847',
    reason: 'Labor billed at 3× book rate. Parts marked up 180%. "Diagnostic fee" charged twice.',
    color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)',
  },
  {
    score: 'MAYBE', emoji: '⚠️',
    doc: 'Phone Bill',
    amount: '$43',
    reason: '"Device Protection Plus" was never agreed to. Activation fee waived in contract but still charged.',
    color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',
  },
  {
    score: 'SAFE', emoji: '✅',
    doc: 'Employment Contract',
    amount: '',
    reason: 'Compensation, termination, and IP clauses are standard. No predatory language detected.',
    color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.15)',
  },
]

// ── Testimonials ────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "Found $1,100 in bogus labor charges on my mechanic invoice. Showed the breakdown to the shop — they removed $800 on the spot. This thing paid for itself in 5 minutes.",
    name: 'Marcus T.',
    location: 'Houston, TX',
    doc: 'Mechanic Invoice',
    initials: 'MT',
    color: '#ff6b60',
  },
  {
    quote: "My dentist billed me for a procedure that was covered 100% by insurance. The AI flagged it as duplicate billing. Got a $590 refund I never would've caught.",
    name: 'Priya K.',
    location: 'Chicago, IL',
    doc: 'Dental Bill',
    initials: 'PK',
    color: '#f59e0b',
  },
  {
    quote: "Uploaded my new lease before signing. It flagged a clause that would've let my landlord enter without notice. Negotiated it out before I ever put pen to paper.",
    name: 'Jason M.',
    location: 'Seattle, WA',
    doc: 'Lease Agreement',
    initials: 'JM',
    color: '#4ade80',
  },
]

// ── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'Is this actually free?',
    a: 'Yes — you get 5 free scans every day, no account or credit card required. Scanning more than that? ScrewedScore Pro is $6.99/mo (or $49/yr) for unlimited scans, and there\'s a $2.99 one-time 30-day pass if you just have a big stack of bills to get through.',
  },
  {
    q: 'What file types can I upload?',
    a: 'PDF, Word (.docx), JPEG, PNG, and plain text. You can also photograph a paper bill with your phone — the AI reads it through the image. Documents in Spanish, French, German, Portuguese, Chinese, Arabic, Japanese, Korean, Hindi, Italian, Russian, and Dutch are automatically detected and analyzed in that language.',
  },
  {
    q: 'Is my document kept private?',
    a: 'Yes — completely. Your file is read once by AI and then permanently deleted from our servers. We never store, sell, share, or use your documents to train AI. Your result is saved under a private UUID link — only people you explicitly share it with can see it. No personal info is required to scan.',
  },
  {
    q: 'How accurate is the AI?',
    a: "The scoring uses Claude Sonnet (Anthropic's latest model) to cross-check each line item against industry pricing norms and contract law patterns. It flags what looks suspicious and explains why — but always review with a professional before taking legal or financial action.",
  },
  {
    q: 'What if I find something wrong?',
    a: 'Every analysis includes a "What to Do Next" section with specific language to use when confronting the business or negotiating. Paid scans also include a shareable result link and a viral TikTok/Reels script.',
  },
  {
    q: 'Can I dispute a charge directly?',
    a: 'Yes — every SCREWED or MAYBE result includes access to the Dispute Hub. Open a formal thread linked to the vendor, describe what happened, and they can respond publicly. Every outcome you report (full win, partial, or refused) adds to the community recovery total.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">

      {/* ── Atmospheric background ───────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] h-[75vh]"
          style={{ background: 'radial-gradient(ellipse, rgba(255,59,48,0.065) 0%, transparent 58%)' }} />
        <div className="absolute bottom-0 right-0 w-[70vw] h-[55vh]"
          style={{ background: 'radial-gradient(ellipse at bottom right, rgba(255,59,48,0.025) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
        <div className="absolute inset-0 noise-bg" />
      </div>

      <main className="relative">
        <AnalysisShell>
          <>
            {/* ════ HERO ══════════════════════════════════════════════════ */}
            <section className="relative flex flex-col items-center justify-center min-h-screen sm:min-h-[90vh] px-4 pt-20 sm:pt-24 pb-16 text-center overflow-hidden">

              {/* Pill badge overline */}
              <div className="animate-fade-up mb-8 sm:mb-10">
                <span className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.18)', color: 'rgba(255,140,120,0.9)', letterSpacing: '0.02em' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
                  Free · No account required · AI-powered results in 20 seconds
                </span>
              </div>

              {/* Headline */}
              <div className="animate-fade-up delay-100 mb-4 sm:mb-6">
                <p className="font-black text-brand-text/80 tracking-tight" style={{ fontSize: 'clamp(20px, 3.5vw, 36px)', lineHeight: 1.1 }}>
                  Are you being
                </p>
                <h1 className="font-display font-black tracking-tighter" style={{
                  fontSize: 'clamp(68px, 15vw, 148px)',
                  lineHeight: 0.88,
                  background: 'linear-gradient(135deg, #ff9080 0%, #ff3b30 45%, #bf1a0e 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 100px rgba(255,59,48,0.35))',
                  fontStyle: 'italic',
                }}>
                  screwed?
                </h1>
              </div>

              {/* Subhead */}
              <p className="animate-fade-up delay-200 text-lg sm:text-xl text-brand-text/90 max-w-lg mx-auto leading-relaxed mb-2">
                The free AI checker for bills, contracts &amp; invoices.
              </p>
              <p className="animate-fade-up delay-200 text-base sm:text-lg text-brand-sub/90 max-w-md mx-auto leading-relaxed mb-6 sm:mb-7">
                Upload one and AI flags overcharges, hidden fees, and shady clauses in about 20 seconds.
              </p>

              {/* Upload zone */}
              <div id="upload" className="animate-fade-up delay-200 w-full max-w-xl mx-auto relative mb-7 scroll-mt-20">
                <div className="absolute -inset-6 rounded-3xl -z-10" style={{
                  background: 'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(255,59,48,0.16) 0%, transparent 70%)',
                  filter: 'blur(24px)',
                }} />
                <UploadSlot idPrefix="hero" />
              </div>

              {/* Try sample CTA */}
              <div className="animate-fade-up delay-350 w-full max-w-xl mx-auto -mt-2 mb-2">
                <SampleButton />
              </div>

              {/* Privacy inline disclosure */}
              <div className="animate-fade-up delay-380 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-brand-sub/80 mt-1 mb-6">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-green-500/70" /> Your file is read once by AI, then deleted — never stored, sold, or used for training</span>
                <span className="text-brand-sub/30 hidden sm:inline">·</span>
                <span>No account · No credit card</span>
                <span className="text-brand-sub/30 hidden sm:inline">·</span>
                <a href="/privacy" className="underline underline-offset-2 hover:text-brand-text transition-colors">How we handle your data →</a>
              </div>

              {/* Social proof */}
              <div className="animate-fade-up delay-500 flex items-center justify-center gap-3">
                <div className="flex -space-x-2">
                  {[
                    { c: '#ff6b60', i: 'MT' }, { c: '#f59e0b', i: 'PK' },
                    { c: '#4ade80', i: 'JM' }, { c: '#60a5fa', i: 'RS' }, { c: '#a78bfa', i: 'AL' },
                  ].map(({ c, i }) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-black shrink-0"
                      style={{ background: c + '22', borderColor: '#080808', color: c }}>
                      {i}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-brand-sub/50">
                  Used by early access members
                </span>
              </div>
            </section>

            {/* ════ LIVE TICKER ═══════════════════════════════════════════ */}
            <DeferredLiveTicker />

            {/* ════ STATS BAND ════════════════════════════════════════════ */}
            <section className="animate-fade-up border-t border-b border-brand-border/30 py-16 sm:py-20">
              <div className="max-w-6xl mx-auto px-5 sm:px-8">
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  {[
                    { value: '20 sec',  label: 'average analysis time',      color: '#ff3b30' },
                    { value: '5/day',   label: 'free scans, no account',     color: '#60a5fa' },
                    { value: '78%',     label: 'of scans flag something',    color: '#ffd60a' },
                    { value: '12',      label: 'languages supported',        color: '#30d158' },
                  ].map(({ value, label, color }, idx) => (
                    <div key={label} className={`px-4 sm:px-8 py-6 text-center ${idx > 0 ? 'stat-divider' : ''}`}>
                      <p className="font-black tracking-tighter leading-none mb-2.5"
                        style={{ fontSize: 'clamp(44px, 7vw, 80px)', color }}>
                        {value}
                      </p>
                      <p className="text-[12px] text-brand-sub/65 uppercase tracking-widest leading-tight">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Victory banner sits flush inside the stats band */}
                <div className="mt-6 pt-6 border-t border-brand-border/20">
                  <DeferredVictoryBanner />
                </div>
              </div>
            </section>

            {/* ════ FIGHT BACK KIT — PROMO BANNER ═══════════════════════════ */}
            <section id="fight-back-kit" className="animate-fade-up scroll-mt-20 relative overflow-hidden py-16 sm:py-20 border-t border-b border-yellow-500/10">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full"
                  style={{ background: 'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(245,158,11,0.1) 0%, transparent 60%)' }} />
              </div>
              <div className="relative max-w-4xl mx-auto px-5 sm:px-8 text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                  <Zap className="w-3 h-3" /> The Fight Back Kit
                </div>
                <h2 className="font-black tracking-tighter text-brand-text leading-[1.05]" style={{ fontSize: 'clamp(30px, 5vw, 54px)' }}>
                  Found something wrong?<br />Here&apos;s your 5-piece kit to get paid back.
                </h2>
                <p className="text-brand-sub/60 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                  A demand letter, a word-for-word phone script, a chargeback guide, an escalation path, and a 3-email follow-up sequence — all written for your exact charges, the moment your scan comes back SCREWED or MAYBE.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <a href="#upload"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 30px rgba(245,158,11,0.35)' }}>
                    Scan a bill to unlock it <ChevronRight className="w-4 h-4" />
                  </a>
                  <span className="text-xs font-black" style={{ color: 'rgba(245,158,11,0.7)' }}>$14.99 · One-time · Avg. recovery $400+</span>
                </div>
              </div>
            </section>

            {/* ════ EDITORIAL STATEMENT ═══════════════════════════════════ */}
            <section className="animate-fade-up max-w-4xl mx-auto px-5 sm:px-8 py-28 sm:py-36 text-center">
              <p className="text-[11px] font-bold text-brand-sub/55 uppercase tracking-[0.25em] mb-8">Why this exists</p>
              <p className="font-black tracking-tighter text-brand-text leading-[1.08]" style={{ fontSize: 'clamp(30px, 5.5vw, 56px)' }}>
                Mechanics. Hospitals. Contractors.<br />
                Phone companies.
              </p>
              <p className="font-black tracking-tighter leading-[1.08] mt-2" style={{ fontSize: 'clamp(30px, 5.5vw, 56px)', color: 'rgba(242,242,242,0.5)' }}>
                They all count on you never reading the bill.
              </p>
              <p className="text-brand-sub/60 text-lg mt-10 max-w-xl mx-auto leading-relaxed">
                GetScrewedScore reads it for you. Every line. Every charge. Every clause — and tells you exactly when something is wrong.
              </p>
            </section>

            {/* ════ HOW IT WORKS ══════════════════════════════════════════ */}
            <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-24 space-y-14">
              <div className="text-center space-y-2">
                <p className="text-[11px] font-bold text-brand-sub/55 uppercase tracking-[0.25em]">How it works</p>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">Three steps. Twenty seconds.</h2>
              </div>

              <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
                {[
                  {
                    n: '1', icon: FileText, color: '#60a5fa',
                    title: 'Upload your document',
                    desc: 'Drag & drop any bill, invoice, contract, or photo. PDF, Word, image — we handle it all.',
                  },
                  {
                    n: '2', icon: Sparkles, color: '#f87171',
                    title: 'AI scans for red flags',
                    desc: 'Overcharges, hidden fees, duplicate billing, and suspicious clauses — flagged and explained in plain English.',
                  },
                  {
                    n: '3', icon: TrendingUp, color: '#4ade80',
                    title: 'Know, dispute, fight back',
                    desc: 'SCREWED, MAYBE, or SAFE. Open a formal dispute, track your outcome, and get matched with better providers.',
                  },
                ].map(({ n, icon: Icon, color, title, desc }) => (
                  <div key={n} className="flex flex-col items-start gap-5 px-6 py-7 rounded-2xl border border-brand-border/50 bg-brand-surface" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0" style={{ background: color + '14', border: `1px solid ${color}28`, color }}>
                        {n}
                      </div>
                      <div className="h-px flex-1 max-w-[40px]" style={{ background: `linear-gradient(90deg, ${color}30, transparent)` }} />
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '10', border: `1px solid ${color}20` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-base font-bold text-brand-text mb-2">{title}</p>
                      <p className="text-sm text-brand-sub/55 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ════ BENTO FEATURE GRID ════════════════════════════════════ */}
            <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-28 sm:pb-32 space-y-10">
              <div className="text-center space-y-2">
                <p className="text-[11px] font-bold text-brand-sub/55 uppercase tracking-[0.25em]">The full arsenal</p>
                <h2 className="text-4xl sm:text-5xl font-black text-brand-text tracking-tight">Not just a scanner.</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                {/* Wall of Shame — wide (2 cols) */}
                <div className="bento-cell lg:col-span-2 rounded-2xl border border-brand-border group hover:border-red-500/20 transition-all duration-300"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)', minHeight: '220px' }}>
                  <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at top right, rgba(255,59,48,0.05) 0%, transparent 65%)' }} />
                  <div className="relative p-7 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)' }}>
                          <Flame className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-0.5">Wall of Shame</p>
                          <h3 className="text-xl font-black text-brand-text tracking-tight leading-tight">The worst offenders. Ranked publicly.</h3>
                        </div>
                      </div>
                      <p className="text-sm text-brand-sub/60 leading-relaxed max-w-md">
                        Every scan links anonymously to a vendor. Businesses that repeatedly overcharge rise to the top — a live, community-powered blacklist that builds itself.
                      </p>
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                      <a href="/shame" className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors">
                        View the Wall of Shame <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Fight Back Kit */}
                <div className="bento-cell rounded-2xl group hover:border-yellow-500/20 transition-all duration-300"
                  style={{
                    background: 'linear-gradient(145deg, rgba(245,158,11,0.07) 0%, #0f0f0f 55%)',
                    border: '1px solid rgba(245,158,11,0.18)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                    minHeight: '220px',
                  }}>
                  <div className="p-7 h-full flex flex-col">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.22)' }}>
                      <Zap className="w-5 h-5 text-yellow-400" />
                    </div>
                    <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-1.5">Fight Back Kit</p>
                    <h3 className="text-lg font-black text-brand-text tracking-tight mb-3 leading-tight">5-piece kit to get your money back.</h3>
                    <p className="text-sm text-brand-sub/55 leading-relaxed flex-1">
                      Demand letter, phone script, chargeback guide, escalation path, and a 3-email follow-up sequence — generated for your exact situation.
                    </p>
                    <p className="mt-5 text-xs font-black" style={{ color: 'rgba(245,158,11,0.7)' }}>$14.99 · One-time</p>
                  </div>
                </div>

                {/* Dispute Hub */}
                <div className="bento-cell rounded-2xl border border-brand-border group hover:border-blue-500/20 transition-all duration-300"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)', minHeight: '200px' }}>
                  <div className="absolute bottom-0 left-0 w-44 h-44 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at bottom left, rgba(96,165,250,0.05) 0%, transparent 70%)' }} />
                  <div className="relative p-7">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)' }}>
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5">Dispute Hub</p>
                    <h3 className="text-lg font-black text-brand-text tracking-tight mb-3 leading-tight">Don't just know. Fight back.</h3>
                    <p className="text-sm text-brand-sub/55 leading-relaxed">
                      Open a formal dispute linked to the vendor. They can respond publicly. Every outcome builds the community record.
                    </p>
                  </div>
                </div>

                {/* Vendor Registry */}
                <div className="bento-cell rounded-2xl border border-brand-border group hover:border-green-500/20 transition-all duration-300"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)', minHeight: '200px' }}>
                  <div className="p-7">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.16)' }}>
                      <Building2 className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1.5">Vendor Registry</p>
                    <h3 className="text-lg font-black text-brand-text tracking-tight mb-3 leading-tight">AI reputation scores on every business.</h3>
                    <p className="text-sm text-brand-sub/55 leading-relaxed">
                      Every vendor that appears in a scan gets a public profile. Screwed rate, total flagged dollars, community reviews.
                    </p>
                  </div>
                </div>

                {/* Lost Assets — coming soon */}
                <div className="bento-cell rounded-2xl border border-dashed border-brand-border/70 group transition-all duration-300"
                  style={{ minHeight: '200px' }}>
                  <div className="p-7">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.14)' }}>
                        <Sparkles className="w-5 h-5 text-blue-300/70" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full text-brand-sub/60 border border-brand-border">
                        Coming soon
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-blue-300/60 uppercase tracking-widest mb-1.5">Lost Assets Finder</p>
                    <h3 className="text-lg font-black text-brand-text/80 tracking-tight mb-3 leading-tight">Find money owed to you, not taken from you.</h3>
                    <p className="text-sm text-brand-sub/50 leading-relaxed">
                      A companion search for unclaimed property and dissolved-business assets sitting in your name. In development — starting with a handful of states.
                    </p>
                  </div>
                </div>

                {/* Multilingual pill */}
                <div className="rounded-2xl overflow-hidden flex items-center gap-5 px-7 py-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.07) 0%, #0f0f0f 65%)',
                    border: '1px solid rgba(168,85,247,0.14)',
                  }}>
                  <div className="text-4xl shrink-0">🌐</div>
                  <div>
                    <p className="text-base font-black text-brand-text tracking-tight">12 languages</p>
                    <p className="text-[11px] text-brand-sub/65 mt-1 leading-relaxed tracking-wide">EN ES FR DE PT ZH AR JA KO HI IT RU</p>
                  </div>
                </div>

              </div>
            </section>

            {/* ════ TESTIMONIALS ══════════════════════════════════════════ */}
            <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-24 space-y-10">
              <div className="text-center space-y-2">
                <p className="text-[11px] font-bold text-brand-sub/55 uppercase tracking-[0.25em]">The evidence</p>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">They found out.</h2>
              </div>

              {/* Featured pull quote */}
              <div className="relative rounded-3xl border border-brand-border bg-brand-surface overflow-hidden p-10 sm:p-16"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 80px rgba(255,59,48,0.03)' }}>
                {/* Giant decorative quote mark */}
                <div className="absolute top-4 left-8 font-black leading-none select-none pointer-events-none"
                  style={{
                    fontSize: '160px', lineHeight: 1,
                    color: 'rgba(255,59,48,0.05)',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                  }}>"</div>
                <div className="relative z-10 max-w-2xl mx-auto text-center">
                  <p className="font-bold text-brand-text/85 leading-relaxed mb-10"
                    style={{ fontSize: 'clamp(22px, 3.2vw, 30px)', lineHeight: 1.4 }}>
                    "{TESTIMONIALS[0].quote}"
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background: TESTIMONIALS[0].color + '18', color: TESTIMONIALS[0].color, border: `1px solid ${TESTIMONIALS[0].color}30` }}>
                      {TESTIMONIALS[0].initials}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-brand-text">{TESTIMONIALS[0].name}</p>
                      <p className="text-xs text-brand-sub/50 mt-0.5">{TESTIMONIALS[0].location} · {TESTIMONIALS[0].doc}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two secondary testimonials */}
              <div className="grid sm:grid-cols-2 gap-4">
                {TESTIMONIALS.slice(1).map((t) => (
                  <div key={t.name} className="rounded-2xl border border-brand-border bg-brand-surface p-7 space-y-5 relative overflow-hidden"
                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                    <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none"
                      style={{ background: `radial-gradient(circle at top right, ${t.color}07 0%, transparent 70%)` }} />
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                    </div>
                    <p className="text-sm text-brand-text/75 leading-relaxed relative z-10">"{t.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                        style={{ background: t.color + '16', color: t.color, border: `1px solid ${t.color}28` }}>
                        {t.initials}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-brand-text">{t.name}</p>
                        <p className="text-[10px] text-brand-sub/65 mt-0.5">{t.location} · {t.doc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ════ SCREWED SCORE GAME ════════════════════════════════════ */}
            <DeferredScrewedScoreGame />

            {/* ════ EXAMPLE RESULTS — BENTO ═══════════════════════════════ */}
            <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-24 space-y-10">
              <div className="text-center space-y-2">
                <p className="text-[11px] font-bold text-brand-sub/55 uppercase tracking-[0.25em]">What it looks like</p>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">Real results. Real money.</h2>
                <p className="text-sm text-brand-sub/50 max-w-md mx-auto">Plain-English breakdown. Exact charges. What to do next.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ gridAutoRows: 'auto' }}>

                {/* SCREWED — dominant bento cell */}
                <div className="md:col-span-2 md:row-span-2 rounded-2xl border overflow-hidden relative"
                  style={{
                    borderColor: EXAMPLES[0].border,
                    background: EXAMPLES[0].bg,
                    minHeight: '280px',
                  }}>
                  <div className="p-7 h-full flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black score-text-screwed">🚨 SCREWED</span>
                        <span className="font-black score-text-screwed" style={{ fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1 }}>
                          $847
                        </span>
                      </div>
                      <p className="text-xs font-bold text-brand-sub/50 uppercase tracking-widest">{EXAMPLES[0].doc}</p>
                      <p className="text-base text-brand-text/70 leading-relaxed">{EXAMPLES[0].reason}</p>
                    </div>
                    {/* Faux receipt fragment */}
                    <div className="mt-6 pt-5 border-t border-red-500/15 space-y-0">
                      {[
                        { label: 'Labor (4.5 hrs × $195)', amount: '$877', flagged: true },
                        { label: 'Parts markup (180% over MSRP)', amount: '$310', flagged: true },
                        { label: 'Diagnostic fee ×2 (duplicate)', amount: '$150', flagged: true },
                      ].map(item => (
                        <div key={item.label} className="receipt-item">
                          <span className="text-brand-sub/55 flex-1 pr-4">{item.label}</span>
                          <span className="font-black text-red-400 tabular-nums shrink-0">{item.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* MAYBE */}
                <div className="rounded-2xl border overflow-hidden"
                  style={{ borderColor: EXAMPLES[1].border, background: EXAMPLES[1].bg, minHeight: '130px' }}>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black score-text-maybe">⚠️ MAYBE</span>
                      <span className="text-sm font-black score-text-maybe">{EXAMPLES[1].amount}</span>
                    </div>
                    <p className="text-[10px] font-bold text-brand-sub/50 uppercase tracking-widest">{EXAMPLES[1].doc}</p>
                    <p className="text-sm text-brand-text/65 leading-relaxed">{EXAMPLES[1].reason}</p>
                  </div>
                </div>

                {/* SAFE */}
                <div className="rounded-2xl border overflow-hidden"
                  style={{ borderColor: EXAMPLES[2].border, background: EXAMPLES[2].bg, minHeight: '130px' }}>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center">
                      <span className="text-sm font-black score-text-safe">✅ SAFE</span>
                    </div>
                    <p className="text-[10px] font-bold text-brand-sub/50 uppercase tracking-widest">{EXAMPLES[2].doc}</p>
                    <p className="text-sm text-brand-text/65 leading-relaxed">{EXAMPLES[2].reason}</p>
                  </div>
                </div>

              </div>
            </section>

            {/* ════ DOC TYPES — CHIP STRIP ════════════════════════════════ */}
            <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-24 space-y-10">
              <div className="text-center space-y-2">
                <p className="text-[11px] font-bold text-brand-sub/55 uppercase tracking-[0.25em]">Supported documents</p>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">Anything they bill you for.</h2>
              </div>

              <div className="flex flex-wrap justify-center gap-2.5">
                {DOC_TYPES.map(({ emoji, label, heat }) => (
                  <div key={label}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold cursor-default transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      border: heat === 'high' ? '1px solid rgba(255,59,48,0.2)' : '1px solid rgba(255,255,255,0.07)',
                      background: heat === 'high' ? 'rgba(255,59,48,0.05)' : 'rgba(255,255,255,0.03)',
                      color: heat === 'high' ? 'rgba(255,120,110,0.8)' : 'rgba(119,119,119,0.8)',
                    }}>
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ════ FAQ ═══════════════════════════════════════════════════ */}
            <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-28 sm:pb-32">
              <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-16 space-y-10 lg:space-y-0">

                {/* Left: heading */}
                <div className="lg:pt-2">
                  <p className="text-[11px] font-bold text-brand-sub/55 uppercase tracking-[0.25em] mb-4">FAQ</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight leading-tight mb-4">
                    Questions people actually ask
                  </h2>
                  <p className="text-sm text-brand-sub/50 leading-relaxed">
                    Results are informational only — not legal or financial advice. Always verify with a professional before taking action.
                  </p>
                </div>

                {/* Right: accordion */}
                <div className="space-y-2">
                  {FAQ_ITEMS.map((item, i) => (
                    <FaqItem key={i} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            </section>

            {/* ════ BOTTOM CTA — FULL BLEED ═══════════════════════════════ */}
            <section className="relative overflow-hidden py-32 sm:py-40 border-t border-brand-border/20">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full"
                  style={{ background: 'radial-gradient(ellipse 80% 120% at 50% 0%, rgba(255,59,48,0.14) 0%, transparent 60%)' }} />
                <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
              </div>

              <div className="relative max-w-2xl mx-auto px-4 text-center space-y-8">
                <div className="space-y-4">
                  <p className="text-[11px] font-bold text-red-400/60 uppercase tracking-[0.25em]">Start free right now</p>
                  <h2 className="font-display font-black text-brand-text tracking-tighter leading-[0.9]"
                    style={{ fontSize: 'clamp(56px, 10vw, 120px)' }}>
                    Stop wondering.<br />
                    <span style={{
                      background: 'linear-gradient(135deg, #ff8a80, #ff3b30)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Start knowing.</span>
                  </h2>
                  <p className="text-brand-sub/50 text-base max-w-sm mx-auto leading-relaxed">
                    Free scans. No account. No credit card. If you find something, you&apos;ll want to share it.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -inset-6 rounded-3xl -z-10" style={{
                    background: 'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(255,59,48,0.15) 0%, transparent 70%)',
                    filter: 'blur(24px)',
                  }} />
                  <UploadSlot idPrefix="cta" />
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <p className="flex items-center justify-center gap-2 text-sm font-semibold text-green-400/70">
                    <ShieldCheck className="w-4 h-4 text-green-400/60" />
                    Your documents are never stored, sold, or shared.
                  </p>
                  <p className="text-xs text-brand-sub/55">
                    File deleted immediately after scan · Results saved privately · No account required
                  </p>
                </div>
              </div>
            </section>
          </>
        </AnalysisShell>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-brand-border mt-10 py-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-sub">
          <div className="flex items-center gap-1">
            <span className="font-black text-brand-text">Get</span>
            <span className="font-black text-red-400">Screwed</span>
            <span className="font-black text-brand-text">Score</span>
            <span className="ml-2 text-brand-sub/40">· Not legal or financial advice</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/shame" className="hover:text-brand-text transition-colors">Wall of Shame</a>
            <a href="/community" className="hover:text-brand-text transition-colors">Community</a>
            <a href="/privacy" className="hover:text-brand-text transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-brand-text transition-colors">Terms</a>
            <span className="text-brand-sub/40">© {new Date().getFullYear()} REMbyDesign</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── FAQ accordion item ───────────────────────────────────────────────────────
// A native <details>/<summary> pair: same open/close behaviour as the old
// useState accordion, but it works in the server HTML with no client JS.
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="faq-item rounded-2xl border border-brand-border bg-brand-surface overflow-hidden transition-all">
      <summary className="w-full flex items-center justify-between px-6 py-5 text-left gap-4 hover:bg-brand-muted/30 transition-colors cursor-pointer list-none">
        <span className="text-sm font-bold text-brand-text">{q}</span>
        <ChevronDown className="faq-chevron w-4 h-4 text-brand-sub shrink-0 transition-transform duration-200" />
      </summary>
      <div className="px-5 pb-5">
        <p className="text-sm text-brand-sub leading-relaxed border-t border-brand-border/50 pt-4">{a}</p>
      </div>
    </details>
  )
}
