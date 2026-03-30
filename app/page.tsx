'use client'

import { useState, useCallback, useEffect } from 'react'
import { UploadZone } from '@/components/UploadZone'
import { ProgressBar } from '@/components/ProgressBar'
import { ScoreCard } from '@/components/ScoreCard'
import { FindingsList } from '@/components/FindingsList'
import { EmailCapture } from '@/components/EmailCapture'
import { ShareButton } from '@/components/ShareButton'
import {
  RotateCcw, AlertCircle, Receipt, FileText, DollarSign,
  Sparkles, ShieldCheck, Zap, TrendingUp, ChevronRight,
  Star, ChevronDown, Users,
} from 'lucide-react'
import type { AppState, AnalysisResult, UploadResponse, AnalyzeResponse } from '@/lib/types'
import { formatDollar } from '@/lib/utils'
import { PaywallModal } from '@/components/PaywallModal'
import { ContentGenerator } from '@/components/ContentGenerator'
import { TrustedProviders } from '@/components/TrustedProviders'
import { supabase } from '@/lib/supabase'

const INITIAL_STATE: AppState = {
  phase: 'idle', progress: 0, progressLabel: '',
  analysisId: null, result: null, error: null, documentType: null,
}

// ── Live ticker data ────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { score: 'SCREWED', emoji: '🚨', doc: 'Mechanic Invoice',      amount: '$847',   note: 'labor padding detected',         loc: 'Phoenix, AZ' },
  { score: 'SAFE',    emoji: '✅', doc: 'Employment Contract',   amount: '',        note: 'fair and balanced',              loc: 'Austin, TX'  },
  { score: 'SCREWED', emoji: '🚨', doc: 'Medical Bill',          amount: '$1,240', note: 'duplicate billing found',        loc: 'Chicago, IL' },
  { score: 'MAYBE',   emoji: '⚠️', doc: 'Phone Bill',            amount: '$43',    note: 'mystery fees flagged',           loc: 'Miami, FL'   },
  { score: 'SCREWED', emoji: '🚨', doc: 'Contractor Estimate',   amount: '$2,100', note: '3× market rate on materials',    loc: 'Denver, CO'  },
  { score: 'MAYBE',   emoji: '⚠️', doc: 'Lease Agreement',       amount: '$310',   note: 'unusual fee clauses',            loc: 'Seattle, WA' },
  { score: 'SCREWED', emoji: '🚨', doc: 'Dental Bill',           amount: '$590',   note: 'unbundled procedure codes',      loc: 'Dallas, TX'  },
  { score: 'SAFE',    emoji: '✅', doc: 'Insurance Quote',        amount: '',        note: 'pricing within normal range',    loc: 'Portland, OR'},
  { score: 'SCREWED', emoji: '🚨', doc: 'Internet Bill',         amount: '$34/mo', note: 'phantom equipment rental',       loc: 'Atlanta, GA' },
  { score: 'MAYBE',   emoji: '⚠️', doc: 'Brand Deal Contract',   amount: '',        note: 'IP grab clause found',           loc: 'LA, CA'      },
]

const SCORE_COLOR: Record<string, string> = {
  SCREWED: 'text-red-400', MAYBE: 'text-yellow-400', SAFE: 'text-green-400',
}
const SCORE_BG: Record<string, string> = {
  SCREWED: 'bg-red-500/10 border-red-500/20',
  MAYBE:   'bg-yellow-500/10 border-yellow-500/20',
  SAFE:    'bg-green-500/10 border-green-500/20',
}

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
    a: 'Yes — 2 full scans are free, no account required. If you find something (most people do), Pro gives you unlimited scans for $9.99/month.',
  },
  {
    q: 'What file types can I upload?',
    a: 'PDF, Word (.docx), JPEG, PNG, and plain text. You can also photograph a paper bill with your phone — the AI reads it through the image.',
  },
  {
    q: 'Is my document kept private?',
    a: 'Your document text is processed and then discarded. We do not store, sell, or use your documents to train AI models. Your result is saved under a private UUID link — only people you share it with can see it.',
  },
  {
    q: 'How accurate is the AI?',
    a: 'The scoring uses Claude Sonnet (Anthropic\'s latest model) to cross-check each line item against industry pricing norms and contract law patterns. It flags what looks suspicious and explains why — but always review with a professional before taking legal or financial action.',
  },
  {
    q: 'What if I find something wrong?',
    a: 'Every analysis includes a "What to Do Next" section with specific language to use when confronting the business or negotiating. Pro users also get a viral TikTok/Reels script to share their result.',
  },
]

export default function HomePage() {
  const [state, setState]       = useState<AppState>(INITIAL_STATE)
  const [showPaywall, setShowPaywall] = useState(false)
  const [isPro, setIsPro]       = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const checkPro = () => setIsPro(
      typeof document !== 'undefined' && document.cookie.includes('gss_pro=')
    )
    checkPro()
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null)
      checkPro()
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
  }

  const setPhase = (phase: AppState['phase'], progress: number, label: string) =>
    setState(s => ({ ...s, phase, progress, progressLabel: label }))

  const handleUpload = useCallback(async (file: File) => {
    setState({ ...INITIAL_STATE, phase: 'uploading', progress: 10, progressLabel: 'Uploading file...' })
    try {
      const form = new FormData()
      form.append('file', file)
      setPhase('uploading', 25, 'Uploading file...')

      const uploadRes  = await fetch('/api/upload', { method: 'POST', body: form })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        if (uploadRes.status === 429 || uploadData.error === 'LIMIT_REACHED') {
          setState(INITIAL_STATE)
          setShowPaywall(true)
          return
        }
        setState(s => ({ ...s, phase: 'error', error: uploadData.error ?? 'Upload failed' }))
        return
      }

      const { document_id, document_type } = uploadData as UploadResponse
      setPhase('parsing', 45, 'Reading your document...')
      await delay(400)
      setPhase('analyzing', 65, 'Running AI analysis...')

      const analyzeRes  = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id }),
        }
      )
      setPhase('analyzing', 88, 'Computing your Screwed Score...')

      const analyzeText = await analyzeRes.text()
      let analyzeData: { error?: string; analysis_id?: string; result?: AnalyzeResponse['result'] } = {}
      try { analyzeData = JSON.parse(analyzeText) } catch { /* non-JSON response */ }
      if (!analyzeRes.ok) {
        setState(s => ({ ...s, phase: 'error', error: analyzeData.error ?? 'Analysis timed out — please try again.' }))
        return
      }

      const { analysis_id, result } = analyzeData as unknown as AnalyzeResponse
      setState(s => ({
        ...s, phase: 'done', progress: 100, progressLabel: 'Done',
        analysisId: analysis_id, documentType: document_type,
        result: { ...result, created_at: new Date().toISOString() },
      }))
    } catch (err) {
      setState(s => ({
        ...s, phase: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      }))
    }
  }, [])

  const handleReset = () => setState(INITIAL_STATE)
  const isLoading   = state.phase === 'uploading' || state.phase === 'parsing' || state.phase === 'analyzing'

  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">

      {showPaywall && (
        <PaywallModal onClose={() => setShowPaywall(false)} onGoogleLogin={handleGoogleLogin} />
      )}

      {/* ── Background atmosphere ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Main red halo */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(255,59,48,0.12) 0%, transparent 65%)', filter: 'blur(1px)' }} />
        {/* Grid texture */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40" />
        {/* Vignette */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 60%, rgba(8,8,8,0.8) 100%)' }} />
      </div>

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-brand-border/50 bg-brand-bg/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-1 select-none">
            <span className="text-base font-black text-brand-text tracking-tight">Get</span>
            <span className="text-base font-black tracking-tight" style={{
              background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Screwed</span>
            <span className="text-base font-black text-brand-text tracking-tight">Score</span>
          </div>

          <div className="flex items-center gap-3">
            {isPro && (
              <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-red-400 border border-red-500/30 rounded-full px-2.5 py-1 uppercase tracking-wider">
                <Zap className="w-3 h-3" /> Pro
              </span>
            )}
            {state.phase === 'done' ? (
              <button onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-brand-sub hover:text-brand-text transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-muted">
                <RotateCcw className="w-3.5 h-3.5" /> New scan
              </button>
            ) : (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-brand-sub">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Free · No account needed
              </span>
            )}
            {userEmail ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-xs text-green-400 font-semibold">✓ {userEmail.split('@')[0]}</span>
                <button
                  onClick={() => supabase.auth.signOut().then(() => setUserEmail(null))}
                  className="text-xs text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors">
                  Sign out
                </button>
              </div>
            ) : (
              <button onClick={handleGoogleLogin}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative">

        {/* ════════════════════════════════════════════════════════════════
            IDLE STATE — full landing page
        ════════════════════════════════════════════════════════════════ */}
        {state.phase === 'idle' && (
          <>

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-10 text-center relative">

              {/* Floating score cards — decorative, desktop only */}
              <div className="hidden xl:block absolute left-0 top-32 -rotate-3 opacity-80 pointer-events-none animate-float"
                style={{ animationDelay: '0.5s' }}>
                <div className="rounded-2xl border border-yellow-500/25 bg-brand-surface/95 backdrop-blur-sm p-4 w-52 shadow-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-yellow-400">⚠️ MAYBE</span>
                    <span className="text-[11px] font-black text-yellow-400">$43</span>
                  </div>
                  <p className="text-[10px] text-brand-sub leading-relaxed">Mystery "device protection" fee never agreed to.</p>
                  <div className="mt-2.5 pt-2 border-t border-brand-border/40">
                    <span className="text-[9px] text-brand-sub/40">Phone Bill · Miami, FL</span>
                  </div>
                </div>
              </div>

              <div className="hidden xl:block absolute right-0 top-24 rotate-2 opacity-85 pointer-events-none animate-float">
                <div className="rounded-2xl border border-red-500/30 bg-brand-surface/95 backdrop-blur-sm p-4 w-56 shadow-2xl"
                  style={{ boxShadow: '0 0 30px rgba(255,59,48,0.08)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-red-400">🚨 SCREWED</span>
                    <span className="text-[11px] font-black text-red-400">$847</span>
                  </div>
                  <p className="text-[10px] text-brand-sub leading-relaxed">Labor at 3× book rate. Diagnostic fee charged twice.</p>
                  <div className="mt-2.5 pt-2 border-t border-brand-border/40">
                    <span className="text-[9px] text-brand-sub/40">Mechanic Invoice · Phoenix, AZ</span>
                  </div>
                </div>
              </div>

              <div className="hidden xl:block absolute right-4 bottom-28 -rotate-1 opacity-60 pointer-events-none animate-float"
                style={{ animationDelay: '1s' }}>
                <div className="rounded-2xl border border-green-500/20 bg-brand-surface/90 backdrop-blur-sm p-4 w-48 shadow-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-black text-green-400">✅ SAFE</span>
                  </div>
                  <p className="text-[10px] text-brand-sub leading-relaxed">Fair and balanced. 3 protective clauses found.</p>
                  <div className="mt-2.5 pt-2 border-t border-brand-border/40">
                    <span className="text-[9px] text-brand-sub/40">Employment Contract · Austin, TX</span>
                  </div>
                </div>
              </div>

              {/* Live badge */}
              <div className="animate-fade-up inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-red-500/20 bg-red-500/6 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Live AI Analysis</span>
                <span className="text-xs text-brand-sub">·</span>
                <span className="text-xs text-brand-sub">Free · No account</span>
              </div>

              {/* Main headline */}
              <h1 className="animate-fade-up delay-100 font-black leading-[0.88] tracking-tighter mb-6"
                style={{ fontSize: 'clamp(52px, 10vw, 96px)' }}>
                <span className="text-brand-text block">Are you being</span>
                <span className="block italic" style={{
                  background: 'linear-gradient(135deg, #ff8a80 0%, #ff3b30 40%, #cc1a10 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  textShadow: 'none',
                  filter: 'drop-shadow(0 0 60px rgba(255,59,48,0.4))',
                }}>
                  screwed?
                </span>
              </h1>

              {/* Subheadline */}
              <p className="animate-fade-up delay-200 text-lg sm:text-xl text-brand-sub max-w-2xl mx-auto leading-relaxed mb-3">
                The average American overpays{' '}
                <span className="text-brand-text font-bold">$1,400/year</span>
                {' '}on bills, invoices, and contracts they never check.
              </p>
              <p className="animate-fade-up delay-300 text-sm text-brand-sub/60 mb-10">
                Upload yours. AI scans for red flags, hidden fees, and overcharges — in 20 seconds. Free.
              </p>

              {/* Hero illustration */}
              <div className="animate-fade-up delay-200 flex justify-center mb-4 sm:hidden">
                <HeroIllustrationSmall />
              </div>

              {/* Upload zone — the hero element */}
              <div className="animate-fade-up delay-300 relative max-w-xl mx-auto">
                {/* Glow halo behind upload zone */}
                <div className="absolute inset-0 rounded-2xl -z-10"
                  style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,59,48,0.18) 0%, transparent 70%)', filter: 'blur(20px)' }} />
                <UploadZone onUpload={handleUpload} isLoading={false} />
              </div>

              {/* Trust row */}
              <div className="animate-fade-up delay-400 flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 text-xs text-brand-sub/50">
                {['No account needed', 'No credit card', 'Results in ~20s', 'Data never sold'].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-green-500/60" />
                    {t}
                  </span>
                ))}
              </div>

              {/* Social proof count */}
              <div className="animate-fade-up delay-500 flex items-center justify-center gap-2 mt-5">
                <div className="flex -space-x-2">
                  {['#ff6b60','#f59e0b','#4ade80','#60a5fa','#a78bfa'].map((c, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-brand-bg flex items-center justify-center text-[8px] font-black"
                      style={{ background: c + '25', borderColor: '#080808', color: c }}>
                      {['MT','PK','JM','RS','AL'][i]}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-brand-sub/50">
                  <span className="text-brand-sub font-semibold">23,400+</span> documents scanned
                </span>
              </div>
            </section>

            {/* ── Live ticker ───────────────────────────────────────────── */}
            <div className="animate-fade-in delay-500 border-y border-brand-border/60 overflow-hidden py-3 my-6"
              style={{ background: 'linear-gradient(90deg, rgba(8,8,8,0.98) 0%, transparent 5%, transparent 95%, rgba(8,8,8,0.98) 100%)' }}>
              <div className="flex items-center gap-3 mb-0">
                {/* Duplicate for seamless loop */}
                <div className="ticker-track gap-8 pl-8">
                  {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                    <span key={i} className="inline-flex items-center gap-3 pr-12">
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded border ${SCORE_BG[item.score]} ${SCORE_COLOR[item.score]}`}>
                        {item.emoji} {item.score}
                      </span>
                      <span className="text-xs text-brand-text font-semibold">{item.doc}</span>
                      {item.amount && (
                        <span className="text-xs font-bold text-red-400">{item.amount}</span>
                      )}
                      <span className="text-xs text-brand-sub/50">{item.note}</span>
                      <span className="text-[10px] text-brand-sub/30">·</span>
                      <span className="text-[10px] text-brand-sub/40">{item.loc}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-24 pb-24">

              {/* ── Stats ─────────────────────────────────────────────── */}
              <section className="animate-fade-up">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  {[
                    { value: '$4.2M+',  label: 'in overcharges found',      icon: DollarSign, color: 'text-red-400',    glow: 'rgba(255,59,48,0.06)'   },
                    { value: '23,400+', label: 'documents analyzed',         icon: FileText,   color: 'text-blue-400',   glow: 'rgba(96,165,250,0.05)'  },
                    { value: '~20s',    label: 'average scan time',          icon: Zap,        color: 'text-yellow-400', glow: 'rgba(250,204,21,0.06)'  },
                    { value: '78%',     label: 'of scans find something',    icon: Users,      color: 'text-green-400',  glow: 'rgba(74,222,128,0.05)'  },
                  ].map(({ value, label, icon: Icon, color, glow }) => (
                    <div key={label} className="rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6 text-center space-y-2 relative overflow-hidden"
                      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 30px ${glow}` }}>
                      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
                      <div className="w-8 h-8 rounded-xl mx-auto flex items-center justify-center relative z-10"
                        style={{ background: glow, border: `1px solid ${glow.replace('0.0', '0.2')}` }}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <p className={`text-3xl sm:text-4xl font-black relative z-10 ${color}`}>{value}</p>
                      <p className="text-[11px] text-brand-sub relative z-10 leading-tight">{label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Testimonials ──────────────────────────────────────── */}
              <section className="animate-fade-up space-y-8">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-bold text-brand-sub uppercase tracking-widest">Real stories</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
                    They found out. Now they know.
                  </h2>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  {TESTIMONIALS.map((t) => (
                    <div key={t.name} className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-4 text-left relative overflow-hidden"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                      {/* Subtle color glow top-right */}
                      <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
                        style={{ background: `radial-gradient(circle, ${t.color}08 0%, transparent 70%)` }} />
                      {/* Stars */}
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-sm text-brand-text/80 leading-relaxed relative z-10">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                          style={{ background: t.color + '18', color: t.color, border: `1px solid ${t.color}30` }}>
                          {t.initials}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-brand-text">{t.name}</p>
                          <p className="text-[10px] text-brand-sub">{t.location} · {t.doc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Example results ───────────────────────────────────── */}
              <section className="animate-fade-up space-y-8">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-bold text-brand-sub uppercase tracking-widest">What it looks like</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
                    Real results. Real money.
                  </h2>
                  <p className="text-brand-sub text-sm max-w-md mx-auto">
                    Every scan gives you a plain-English breakdown of exactly what&apos;s wrong — and what to do about it.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  {EXAMPLES.map((ex) => (
                    <div key={ex.doc} className="rounded-2xl border overflow-hidden relative group"
                      style={{ borderColor: ex.border, background: ex.bg, boxShadow: `0 0 40px ${ex.bg}` }}>
                      <div className="p-5 space-y-4">
                        {/* Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black" style={{ color: ex.color }}>
                            {ex.emoji} {ex.score}
                          </span>
                          {ex.amount && (
                            <span className="ml-auto text-sm font-black" style={{ color: ex.color }}>
                              {ex.amount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-brand-sub uppercase tracking-wider">{ex.doc}</p>
                        <p className="text-sm text-brand-text/75 leading-relaxed">{ex.reason}</p>
                      </div>
                      {/* Bottom bar */}
                      <div className="px-5 py-3 border-t flex items-center gap-2 text-xs text-brand-sub/50"
                        style={{ borderColor: ex.border }}>
                        <Sparkles className="w-3 h-3" />
                        AI-generated analysis
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Document types ────────────────────────────────────── */}
              <section className="animate-fade-up space-y-8">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-bold text-brand-sub uppercase tracking-widest">Supported documents</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
                    If they charged you, we can check it.
                  </h2>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {DOC_TYPES.map(({ emoji, label, heat }) => (
                    <div key={label}
                      className="rounded-xl border border-brand-border bg-brand-surface p-4 flex flex-col items-center gap-2 text-center hover:border-red-500/30 transition-colors cursor-default relative"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                      {heat === 'high' && (
                        <span className="absolute top-2 right-2 text-[8px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          🔥 High risk
                        </span>
                      )}
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-[11px] font-semibold text-brand-sub leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── How it works ──────────────────────────────────────── */}
              <section className="animate-fade-up space-y-8">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-bold text-brand-sub uppercase tracking-widest">How it works</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
                    Three steps. Twenty seconds.
                  </h2>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 relative">
                  {/* Connector line */}
                  <div className="hidden sm:block absolute top-10 left-[20%] right-[20%] h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,59,48,0.3) 30%, rgba(255,59,48,0.3) 70%, transparent)' }} />

                  {[
                    {
                      n: '01', icon: FileText, color: '#60a5fa',
                      title: 'Upload your document',
                      desc: 'Drag & drop any bill, invoice, contract, or photo. PDF, Word, image — we handle it all.',
                    },
                    {
                      n: '02', icon: Sparkles, color: '#f87171',
                      title: 'AI scans for red flags',
                      desc: 'Our AI checks for overcharges, hidden fees, duplicate billing, and suspicious clauses.',
                    },
                    {
                      n: '03', icon: TrendingUp, color: '#4ade80',
                      title: 'Get your Screwed Score',
                      desc: 'SCREWED, MAYBE, or SAFE — plus exactly what to say to fight back or renegotiate.',
                    },
                  ].map(({ n, icon: Icon, color, title, desc }) => (
                    <div key={n} className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-4 relative"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: color + '15', border: `1px solid ${color}30` }}>
                          <Icon className="w-5 h-5" style={{ color }} />
                        </div>
                        <span className="text-[10px] font-black text-brand-sub/30 tracking-widest">{n}</span>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-bold text-brand-text">{title}</p>
                        <p className="text-xs text-brand-sub leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── FAQ ──────────────────────────────────────────────── */}
              <section className="animate-fade-up space-y-8">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-bold text-brand-sub uppercase tracking-widest">FAQ</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
                    Questions people actually ask
                  </h2>
                </div>
                <div className="space-y-2 max-w-2xl mx-auto">
                  {FAQ_ITEMS.map((item, i) => (
                    <FaqItem key={i} q={item.q} a={item.a} />
                  ))}
                </div>
              </section>

              {/* ── Bottom CTA ────────────────────────────────────────── */}
              <section className="animate-fade-up rounded-3xl overflow-hidden relative"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,59,48,0.1) 0%, rgba(255,59,48,0.03) 100%)',
                  border: '1px solid rgba(255,59,48,0.2)',
                  boxShadow: '0 0 80px rgba(255,59,48,0.1)',
                }}>
                {/* Background glow */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full"
                    style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(255,59,48,0.15) 0%, transparent 70%)' }} />
                </div>

                <div className="relative p-10 sm:p-16 text-center space-y-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Start free right now</p>
                    <h2 className="text-4xl sm:text-5xl font-black text-brand-text tracking-tighter leading-tight">
                      Stop wondering.<br />
                      <span style={{
                        background: 'linear-gradient(135deg, #ff8a80, #ff3b30)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }}>Start knowing.</span>
                    </h2>
                    <p className="text-brand-sub max-w-md mx-auto text-sm leading-relaxed">
                      Two free scans. No account. No credit card. If you find something, you&apos;ll want to share it.
                    </p>
                  </div>

                  <div className="max-w-lg mx-auto">
                    <UploadZone onUpload={handleUpload} isLoading={false} />
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-brand-sub/40">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500/40" />
                    Your documents are never stored permanently or shared with third parties.
                  </div>
                </div>
              </section>

            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            LOADING STATE
        ════════════════════════════════════════════════════════════════ */}
        {isLoading && (
          <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
            <UploadZone onUpload={handleUpload} isLoading />
            <ProgressBar phase={state.phase} progress={state.progress} label={state.progressLabel} />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            ERROR STATE
        ════════════════════════════════════════════════════════════════ */}
        {state.phase === 'error' && (
          <div className="max-w-2xl mx-auto px-4 py-10">
            <div className="rounded-2xl border border-red-500/25 bg-red-950/15 p-6 space-y-4 animate-fade-up"
              style={{ boxShadow: '0 0 40px rgba(255,59,48,0.1)' }}>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-400">Analysis failed</p>
                  <p className="text-sm text-brand-sub mt-1">{state.error}</p>
                </div>
              </div>
              <button onClick={handleReset}
                className="flex items-center gap-2 text-sm text-brand-sub hover:text-brand-text transition-colors">
                <RotateCcw className="w-4 h-4" /> Try again
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            RESULTS STATE
        ════════════════════════════════════════════════════════════════ */}
        {state.phase === 'done' && state.result && state.analysisId && (
          <div className="max-w-2xl mx-auto px-4 py-10 space-y-4 animate-fade-up">

            <ScoreCard result={state.result} analysisId={state.analysisId} />
            <FindingsList findings={state.result.top_findings} />

            <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-2"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
              <p className="text-[10px] font-semibold text-brand-sub uppercase tracking-widest">Plain English Summary</p>
              <p className="text-sm text-brand-text/75 leading-relaxed">{state.result.plain_summary}</p>
            </div>

            {state.result.overcharge?.line_items?.filter(i => i.flagged).length > 0 && (
              <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                <div className="px-5 py-3 border-b border-brand-border flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">Flagged charges</span>
                  {state.result.overcharge.total_flagged_amount > 0 && (
                    <span className="ml-auto text-sm font-black text-red-400">
                      {formatDollar(state.result.overcharge.total_flagged_amount)} flagged
                    </span>
                  )}
                </div>
                <div className="p-5">
                  {state.result.overcharge.line_items.filter(i => i.flagged).map((item, i) => (
                    <div key={i} className="receipt-item">
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="text-sm font-medium text-brand-text truncate">{item.description}</p>
                        {item.flag_reason && <p className="text-xs text-brand-sub mt-0.5">{item.flag_reason}</p>}
                        {item.industry_context && <p className="text-xs text-green-400 mt-0.5">{item.industry_context}</p>}
                      </div>
                      {item.charged_amount != null && (
                        <span className="font-black text-red-400 tabular-nums shrink-0">${item.charged_amount.toFixed(0)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <TrustedProviders documentType={state.documentType} score={state.result.screwed_score} />

            <ContentGenerator analysisId={state.analysisId} isPro={isPro} onUpgrade={() => setShowPaywall(true)} />

            <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-3"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
              <p className="text-sm font-bold text-brand-text">Share your results</p>
              <p className="text-xs text-brand-sub">Your result page is public at a shareable link. No personal info included.</p>
              <ShareButton analysisId={state.analysisId} score={state.result.screwed_score} variant="full" />
            </div>

            <EmailCapture analysisId={state.analysisId} />

            <div className="text-center pt-2">
              <button onClick={handleReset}
                className="text-sm text-brand-sub hover:text-brand-text transition-colors flex items-center gap-2 mx-auto">
                <RotateCcw className="w-3.5 h-3.5" /> Analyze another document
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-brand-border mt-10 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-sub">
          <div className="flex items-center gap-1">
            <span className="font-black text-brand-text">Get</span>
            <span className="font-black text-red-400">Screwed</span>
            <span className="font-black text-brand-text">Score</span>
            <span className="ml-2 text-brand-sub/40">· Not legal or financial advice</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-brand-text transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-brand-text transition-colors">Terms</a>
            <span className="text-brand-sub/40">© {new Date().getFullYear()} REMbyDesign</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Hero illustration SVG (mobile compact version) ──────────────────────────
function HeroIllustrationSmall() {
  return (
    <svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Doc shadow */}
      <rect x="56" y="20" width="110" height="130" rx="10" fill="rgba(255,59,48,0.04)" />
      {/* Main document */}
      <rect x="50" y="14" width="110" height="130" rx="10" fill="#0f0f0f" stroke="#1c1c1c" strokeWidth="1.5"/>
      {/* Corner fold */}
      <path d="M136 14 L160 38" stroke="#1c1c1c" strokeWidth="1"/>
      <path d="M136 14 L136 38 L160 38" fill="#141414" stroke="#1c1c1c" strokeWidth="0.75"/>
      {/* Doc header */}
      <rect x="66" y="30" width="60" height="6" rx="3" fill="#1e1e1e"/>
      <rect x="66" y="42" width="40" height="4" rx="2" fill="#191919"/>
      {/* Separator */}
      <line x1="66" y1="55" x2="144" y2="55" stroke="#1a1a1a" strokeWidth="1"/>
      {/* Normal line items */}
      <rect x="66" y="63" width="48" height="4" rx="2" fill="#1e1e1e"/>
      <rect x="126" y="63" width="18" height="4" rx="2" fill="#1e1e1e"/>
      {/* Flagged line item */}
      <rect x="62" y="74" width="86" height="14" rx="5" fill="rgba(255,59,48,0.1)" stroke="rgba(255,59,48,0.3)" strokeWidth="1"/>
      <rect x="66" y="78" width="44" height="4" rx="2" fill="rgba(255,100,90,0.5)"/>
      <rect x="126" y="78" width="18" height="4" rx="2" fill="rgba(255,59,48,0.7)"/>
      {/* Warning dot */}
      <circle cx="57" cy="81" r="5" fill="rgba(255,59,48,0.15)" stroke="rgba(255,59,48,0.5)" strokeWidth="1"/>
      <text x="57" y="85" fill="#ff3b30" fontSize="6" textAnchor="middle" fontWeight="900">!</text>
      {/* Normal items */}
      <rect x="66" y="96" width="52" height="4" rx="2" fill="#1e1e1e"/>
      <rect x="126" y="96" width="18" height="4" rx="2" fill="#1e1e1e"/>
      {/* Second flagged */}
      <rect x="62" y="107" width="86" height="14" rx="5" fill="rgba(255,59,48,0.07)" stroke="rgba(255,59,48,0.2)" strokeWidth="1"/>
      <rect x="66" y="111" width="38" height="4" rx="2" fill="rgba(255,100,90,0.35)"/>
      <rect x="126" y="111" width="18" height="4" rx="2" fill="rgba(255,59,48,0.5)"/>
      <circle cx="57" cy="114" r="5" fill="rgba(255,59,48,0.1)" stroke="rgba(255,59,48,0.4)" strokeWidth="1"/>
      <text x="57" y="118" fill="#ff3b30" fontSize="6" textAnchor="middle" fontWeight="900">!</text>
      {/* Total */}
      <line x1="66" y1="128" x2="144" y2="128" stroke="#1c1c1c" strokeWidth="0.75"/>
      <rect x="66" y="133" width="30" height="5" rx="2.5" fill="#2a2a2a"/>
      <rect x="126" y="133" width="18" height="5" rx="2.5" fill="rgba(255,59,48,0.45)"/>

      {/* Magnifying glass */}
      <circle cx="185" cy="90" r="40" fill="rgba(255,59,48,0.03)" stroke="rgba(255,59,48,0.55)" strokeWidth="2"/>
      <line x1="214" y1="119" x2="234" y2="142" stroke="rgba(255,59,48,0.75)" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="185" cy="90" r="30" fill="rgba(255,59,48,0.02)" stroke="rgba(255,59,48,0.1)" strokeWidth="0.75"/>
      {/* Shine on glass */}
      <path d="M165 72 Q173 65 183 67" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round"/>

      {/* SCREWED badge */}
      <rect x="145" y="18" width="82" height="22" rx="8" fill="#0f0f0f" stroke="rgba(255,59,48,0.4)" strokeWidth="1.5"/>
      <text x="186" y="33" fill="#ff3b30" fontSize="9" textAnchor="middle" fontWeight="900">🚨 SCREWED</text>

      {/* Floating $ signs */}
      <text x="228" y="50" fill="rgba(255,59,48,0.55)" fontSize="20" fontWeight="900" fontFamily="system-ui, sans-serif">$</text>
      <text x="22" y="110" fill="rgba(255,59,48,0.4)" fontSize="15" fontWeight="900" fontFamily="system-ui, sans-serif">$</text>
      <text x="218" y="145" fill="rgba(255,59,48,0.25)" fontSize="11" fontWeight="900" fontFamily="system-ui, sans-serif">$</text>

      {/* Sparkle dots */}
      <circle cx="35" cy="40" r="1.5" fill="rgba(255,59,48,0.4)"/>
      <circle cx="245" cy="70" r="1" fill="rgba(255,255,255,0.12)"/>
      <circle cx="245" cy="160" r="1.5" fill="rgba(255,59,48,0.25)"/>
    </svg>
  )
}

// ── FAQ accordion item ───────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden transition-all"
      style={{ boxShadow: open ? '0 0 20px rgba(255,59,48,0.04)' : undefined }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-brand-muted/30 transition-colors">
        <span className="text-sm font-semibold text-brand-text">{q}</span>
        <ChevronDown className={`w-4 h-4 text-brand-sub shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm text-brand-sub leading-relaxed border-t border-brand-border/50 pt-4">{a}</p>
        </div>
      )}
    </div>
  )
}
