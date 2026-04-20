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
  Star, ChevronDown, Users, Flame, MessageSquare, Building2,
} from 'lucide-react'
import type { AppState, AnalysisResult, UploadResponse, AnalyzeResponse } from '@/lib/types'
import { formatDollar } from '@/lib/utils'
import { PaywallModal } from '@/components/PaywallModal'
import { ContentGenerator } from '@/components/ContentGenerator'
import { TrustedProviders } from '@/components/TrustedProviders'
import { RecommendedProviders } from '@/components/RecommendedProviders'
import { ShareExperience } from '@/components/ShareExperience'
import { ReferralCard } from '@/components/ReferralCard'
import { BenchmarkCard } from '@/components/BenchmarkCard'
import { LiveTicker } from '@/components/LiveTicker'
import { OutcomeReport } from '@/components/OutcomeReport'
import { VictoryBanner } from '@/components/VictoryBanner'
import { FightBackKit } from '@/components/FightBackKit'
import { ScrewedScoreGame } from '@/components/ScrewedScoreGame'
import { supabase } from '@/lib/supabase'

const INITIAL_STATE: AppState = {
  phase: 'idle', progress: 0, progressLabel: '',
  analysisId: null, result: null, error: null, documentType: null,
}

const SAMPLE_RESULT: AnalysisResult = {
  id: 'sample',
  document_type: 'mechanic_invoice',
  language: 'en',
  screwed_score: 'SCREWED',
  screwed_score_reason: 'This invoice has 2 critical overcharges, 3 high-severity red flags, and $847 in suspicious charges.',
  screwed_score_percent: 82,
  plain_summary: 'This mechanic invoice bills labor at roughly 3× the standard book rate, marks up parts by 180%, and charges a "diagnostic fee" that appears twice. The total amount is significantly higher than industry norms for the services listed.',
  what_they_tried: [
    'Labor billed at $210/hr — industry average for this region is $65–$95/hr',
    'OEM brake pads listed at $340 — same part retails for $55–$90 at any auto parts store',
    '"Diagnostic fee" of $89 charged twice under different line items',
  ],
  what_to_do_next: [
    'Ask for an itemized breakdown of the $847 in flagged charges before paying',
    'Request the shop\'s posted labor rate — they\'re required to display it',
    'Do not pay until the duplicate diagnostic fee is removed in writing',
    'Get a second opinion from another shop on the parts pricing',
  ],
  top_findings: [
    { severity: 'high', category: 'overcharge', title: 'Suspicious charge: Labor — Engine diagnostic & repair', description: 'Labor billed at $210/hr — industry average for this region is $65–$95/hr', original_text: 'Charged: $420', suggested_fix: 'Typical labor for this job runs $130–$190 total at standard rates', dollar_impact: 420 },
    { severity: 'high', category: 'overcharge', title: 'Suspicious charge: OEM Brake Pads (set of 4)', description: 'Parts marked up 180% over retail — same SKU available for $55–$90', original_text: 'Charged: $340', suggested_fix: 'Industry markup on parts is typically 20–40% over cost', dollar_impact: 340 },
    { severity: 'high', category: 'duplicate_charge', title: 'Duplicate: Diagnostic fee charged twice', description: '"Diagnostic fee" appears as both a line item ($89) and embedded in the labor total — same service billed under two names', original_text: 'Charged: $89', dollar_impact: 89 },
    { severity: 'medium', category: 'risky_clause', title: 'No written estimate authorization', description: 'Invoice lacks a signed authorization line — work was performed without documented customer approval of this cost', suggested_fix: 'Any repair over a threshold (usually $100) requires written authorization under most state consumer protection laws' },
    { severity: 'medium', category: 'missing_protection', title: 'Missing: Parts return policy', description: 'Invoice does not state whether removed parts were returned or are available for inspection — standard practice is to return old parts on request' },
  ],
  overcharge: {
    document_type: 'mechanic_invoice',
    line_items: [
      { description: 'Labor — Engine diagnostic & repair (2.0 hrs)', charged_amount: 420, flagged: true, flag_reason: 'Billed at $210/hr — regional average is $65–$95/hr', industry_context: 'Typical labor for this repair: $130–$190', severity: 'high' },
      { description: 'OEM Brake Pads (set of 4)', charged_amount: 340, flagged: true, flag_reason: 'Parts marked up 180% over retail price', industry_context: 'Same part available for $55–$90', severity: 'high' },
      { description: 'Diagnostic Fee', charged_amount: 89, flagged: true, flag_reason: 'Duplicate — also embedded in labor total', industry_context: 'Standard diagnostic fee: $50–$80, billed once', severity: 'high' },
      { description: 'Shop Supplies & Disposal', charged_amount: 45, flagged: false, flag_reason: null, industry_context: null, severity: null },
      { description: 'Oil & Filter Change', charged_amount: 79, flagged: false, flag_reason: null, industry_context: null, severity: null },
    ],
    total_flagged_amount: 847,
    total_charged_amount: 973,
    industry_range_note: 'Total invoice is $847 above what this repair should reasonably cost at a licensed shop in most US markets.',
    top_concerns: [
      'Labor rate is 2–3× above market rate for this region',
      'Parts marked up significantly above retail — shop may be sourcing at cost and billing at MSRP+',
      'Duplicate diagnostic fee inflates the total by $89',
    ],
    summary: 'This invoice has $847 in flagged charges across three line items. The labor rate and parts markup are both significantly above industry norms, and the diagnostic fee appears to be charged twice.',
  },
  contract_guard: {
    contract_type: 'mechanic_invoice',
    detected_language: 'en',
    plain_english_summary: 'This mechanic invoice bills labor at roughly 3× the standard book rate, marks up parts by 180%, and charges a diagnostic fee twice.',
    key_terms: [],
    red_flags: [
      { title: 'No written estimate authorization', clause_text: 'Invoice lacks customer signature line for estimate approval', severity: 'high', issue: 'Work was performed without documented customer approval — this may violate your state\'s auto repair consumer protection laws', alternative_language: 'Customer authorizes repairs not to exceed $____. Additional work requires written approval.' },
      { title: 'No parts inspection clause', clause_text: 'Replaced parts not mentioned as available for return', severity: 'medium', issue: 'You have a right to inspect removed parts in most states. Not offering this is a red flag.', alternative_language: 'All replaced parts will be returned to customer upon request.' },
      { title: 'Vague labor description', clause_text: 'Labor — Engine diagnostic & repair (2.0 hrs)', severity: 'medium', issue: 'Labor line does not specify what was actually repaired — leaves room for billing disputes' },
    ],
    green_flags: [],
    missing_protections: [
      { protection_name: 'Written estimate authorization', why_important: 'Most states require shops to get written approval before exceeding an estimate', risk_without_it: 'You may have limited recourse if the final bill is higher than verbally quoted', suggested_language: 'All repairs require written authorization. No work will exceed the authorized amount without customer approval.' },
    ],
    overall_grade: 'D',
    questions_to_ask: [
      'Can you show me your posted labor rate? (Shops are required to display this.)',
      'Why does the diagnostic fee appear twice on this invoice?',
      'Can I see the old parts that were replaced?',
    ],
    pro_tips: [
      'Always get a written estimate before authorizing any repair over $100',
      'You can dispute inflated charges with your state\'s Bureau of Automotive Repair',
    ],
  },
  is_public: false,
  created_at: new Date().toISOString(),
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
    a: 'Yes — 3 full scans are free, no account required. After that, unlock additional scans for $2.99 each — one-time, no subscription.',
  },
  {
    q: 'What file types can I upload?',
    a: 'PDF, Word (.docx), JPEG, PNG, and plain text. You can also photograph a paper bill with your phone — the AI reads it through the image. Documents in Spanish, French, German, Portuguese, Chinese, Arabic, Japanese, Korean, Hindi, Italian, Russian, and Dutch are automatically detected and analyzed in that language.',
  },
  {
    q: 'Is my document kept private?',
    a: 'Your document text is processed and then discarded. We do not store, sell, or use your documents to train AI models. Your result is saved under a private UUID link — only people you share it with can see it.',
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
  const [state, setState]           = useState<AppState>(INITIAL_STATE)
  const [showPaywall, setShowPaywall] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const [isSample, setIsSample]     = useState(false)
  const [isPro, setIsPro]           = useState(false)
  const [userEmail, setUserEmail]   = useState<string | null>(null)
  const [refToken, setRefToken]     = useState<string | null>(null)
  const [refBanner, setRefBanner]   = useState(false)
  const [authError, setAuthError]   = useState(false)

  useEffect(() => {
    const checkPro = () => setIsPro(
      typeof document !== 'undefined' &&
      document.cookie.split(';').some(c => c.trim().split('=')[0] === 'gss_pro')
    )
    checkPro()
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null)
      checkPro()
    })

    const params = new URLSearchParams(window.location.search)
    if (params.get('auth_error') === '1') {
      setAuthError(true)
      window.history.replaceState({}, '', window.location.pathname)
    }

    const ref = params.get('ref')
    if (ref) {
      fetch(`/api/referral?token=${encodeURIComponent(ref)}`)
        .then(r => r.json())
        .then(data => {
          if (data.valid) {
            setRefToken(ref)
            setRefBanner(true)
            window.history.replaceState({}, '', '/')
          }
        })
        .catch(() => {})
    }

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

      const { data: sessionData } = await supabase.auth.getSession()
      const authToken = sessionData?.session?.access_token
      const uploadHeaders: Record<string, string> = {}
      if (authToken) uploadHeaders['x-supabase-token'] = authToken
      if (refToken)  uploadHeaders['x-ref-token'] = refToken

      const uploadRes  = await fetch('/api/upload', { method: 'POST', body: form, headers: uploadHeaders })
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

      const { document_id, document_type, limit_reached } = uploadData as UploadResponse
      if (limit_reached) setLimitReached(true)
      if (refToken) { setRefToken(null); setRefBanner(false) }
      setPhase('parsing', 45, 'Reading your document...')
      await delay(400)
      setPhase('analyzing', 65, 'Running AI analysis...')

      const analyzeRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
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
      ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.(
        'event', 'scan_complete',
        { score: result.screwed_score, document_type, screwed_score_percent: result.screwed_score_percent }
      )
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
  }, [refToken])

  const handleReset = () => { setState(INITIAL_STATE); setLimitReached(false); setIsSample(false) }

  const handleSample = () => {
    setIsSample(true)
    setLimitReached(false)
    setState({ ...INITIAL_STATE, phase: 'done', progress: 100, progressLabel: 'Done', analysisId: 'sample', documentType: 'mechanic_invoice', result: SAMPLE_RESULT })
  }
  const isLoading   = state.phase === 'uploading' || state.phase === 'parsing' || state.phase === 'analyzing'

  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">

      {showPaywall && (
        <PaywallModal onClose={() => setShowPaywall(false)} onGoogleLogin={handleGoogleLogin} />
      )}

      {authError && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-4 px-4 py-3 bg-red-950/90 border-b border-red-500/30 text-sm text-red-300 backdrop-blur-sm">
          <span>Sign-in failed — please try again.</span>
          <button onClick={() => setAuthError(false)} className="text-red-400 hover:text-red-200 transition-colors text-xs font-bold">Dismiss</button>
        </div>
      )}

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

        {/* ════════════════════════════════════════════════════════════════════
            IDLE STATE — landing page
        ════════════════════════════════════════════════════════════════════ */}
        {state.phase === 'idle' && (
          <>

            {/* ── Referral banner ─────────────────────────────────────────── */}
            {refBanner && (
              <div className="max-w-2xl mx-auto px-4 pt-6">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-sm">
                  <span className="text-lg">🎁</span>
                  <div>
                    <span className="font-bold text-purple-300">A friend gave you a free scan!</span>
                    <span className="text-brand-sub ml-2">Upload any bill or contract below — no paywall.</span>
                  </div>
                </div>
              </div>
            )}

            {/* ════ HERO ══════════════════════════════════════════════════ */}
            <section className="relative flex flex-col items-center justify-center min-h-[88vh] px-4 pt-20 pb-16 text-center overflow-hidden">

              {/* Overline */}
              <p className="animate-fade-up text-[11px] font-bold text-brand-sub/45 uppercase tracking-[0.25em] mb-8">
                Live AI · Free · No account required
              </p>

              {/* Headline */}
              <div className="animate-fade-up delay-100 mb-8">
                <p className="font-black text-brand-text/55 tracking-tight" style={{ fontSize: 'clamp(20px, 3.2vw, 32px)', lineHeight: 1.1 }}>
                  Are you being
                </p>
                <h1 className="font-black tracking-tighter" style={{
                  fontSize: 'clamp(72px, 14vw, 138px)',
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
              <p className="animate-fade-up delay-200 text-lg sm:text-xl text-brand-sub/75 max-w-lg mx-auto leading-relaxed mb-2">
                The average American overpays <span className="text-brand-text font-bold">$1,300/year</span> on bills they never read.
              </p>
              <p className="animate-fade-up delay-300 text-sm text-brand-sub/45 mb-10 max-w-md mx-auto">
                Upload any document. AI flags overcharges, hidden fees, and red flags in 20 seconds.
              </p>

              {/* Upload zone */}
              <div className="animate-fade-up delay-300 w-full max-w-xl mx-auto relative mb-7">
                <div className="absolute -inset-6 rounded-3xl -z-10" style={{
                  background: 'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(255,59,48,0.16) 0%, transparent 70%)',
                  filter: 'blur(24px)',
                }} />
                <UploadZone onUpload={handleUpload} isLoading={false} />
              </div>

              {/* Try sample CTA */}
              <div className="animate-fade-up delay-350 w-full max-w-xl mx-auto -mt-2 mb-2">
                <button
                  onClick={handleSample}
                  className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 hover:border-brand-border"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(240,244,255,0.55)',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.color = 'rgba(240,244,255,0.8)'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    e.currentTarget.style.color = 'rgba(240,244,255,0.55)'
                  }}
                >
                  See a live example first →
                </button>
              </div>

              {/* Trust row */}
              <div className="animate-fade-up delay-400 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-brand-sub/70 mb-6">
                {['No account needed', 'No credit card', 'Results in ~20s', 'Files deleted after scan'].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-green-500/60" /> {t}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 text-blue-400/60">
                  <span>🌐</span> 12 languages
                </span>
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
            <LiveTicker />

            {/* ════ STATS BAND ════════════════════════════════════════════ */}
            <section className="animate-fade-up border-t border-b border-brand-border/30 py-14">
              <div className="max-w-6xl mx-auto px-5 sm:px-8">
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  {[
                    { value: '20 sec',  label: 'average analysis time',      color: '#ff3b30' },
                    { value: '$2.99',   label: 'per scan after 3 free',      color: '#60a5fa' },
                    { value: '78%',     label: 'of scans flag something',    color: '#ffd60a' },
                    { value: '12',      label: 'languages supported',        color: '#30d158' },
                  ].map(({ value, label, color }, idx) => (
                    <div key={label} className={`px-4 sm:px-8 py-6 text-center ${idx > 0 ? 'stat-divider' : ''}`}>
                      <p className="font-black tracking-tighter leading-none mb-2.5"
                        style={{ fontSize: 'clamp(40px, 6vw, 72px)', color }}>
                        {value}
                      </p>
                      <p className="text-[11px] text-brand-sub/50 uppercase tracking-widest leading-tight">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Victory banner sits flush inside the stats band */}
                <div className="mt-6 pt-6 border-t border-brand-border/20">
                  <VictoryBanner />
                </div>
              </div>
            </section>

            {/* ════ EDITORIAL STATEMENT ═══════════════════════════════════ */}
            <section className="animate-fade-up max-w-4xl mx-auto px-5 sm:px-8 py-24 text-center">
              <p className="text-[11px] font-bold text-brand-sub/35 uppercase tracking-[0.25em] mb-8">Why this exists</p>
              <p className="font-black tracking-tighter text-brand-text leading-[1.05]" style={{ fontSize: 'clamp(28px, 5vw, 52px)' }}>
                Mechanics. Hospitals. Contractors.<br />
                Phone companies.
              </p>
              <p className="font-black tracking-tighter leading-[1.05] mt-2" style={{ fontSize: 'clamp(28px, 5vw, 52px)', color: 'rgba(242,242,242,0.25)' }}>
                They all count on you never reading the bill.
              </p>
              <p className="text-brand-sub/60 text-lg mt-10 max-w-xl mx-auto leading-relaxed">
                GetScrewedScore reads it for you. Every line. Every charge. Every clause — and tells you exactly when something is wrong.
              </p>
            </section>

            {/* ════ HOW IT WORKS ══════════════════════════════════════════ */}
            <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-24 space-y-14">
              <div className="text-center space-y-2">
                <p className="text-[11px] font-bold text-brand-sub/35 uppercase tracking-[0.25em]">How it works</p>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">Three steps. Twenty seconds.</h2>
              </div>

              <div className="grid sm:grid-cols-3 gap-0">
                {[
                  {
                    n: '01', icon: FileText, color: '#60a5fa',
                    title: 'Upload your document',
                    desc: 'Drag & drop any bill, invoice, contract, or photo. PDF, Word, image — we handle it all.',
                  },
                  {
                    n: '02', icon: Sparkles, color: '#f87171',
                    title: 'AI scans for red flags',
                    desc: 'Overcharges, hidden fees, duplicate billing, and suspicious clauses — flagged and explained in plain English.',
                  },
                  {
                    n: '03', icon: TrendingUp, color: '#4ade80',
                    title: 'Know, dispute, fight back',
                    desc: 'SCREWED, MAYBE, or SAFE. Open a formal dispute, track your outcome, and get matched with better providers.',
                  },
                ].map(({ n, icon: Icon, color, title, desc }, idx) => (
                  <div key={n} className={`relative px-8 py-8 ${idx > 0 ? 'section-rule sm:section-rule-none border-t border-l-0 sm:border-t-0 sm:stat-divider' : ''}`}>
                    {/* Ghost number */}
                    <div className="step-ghost-num absolute top-4 right-6 select-none pointer-events-none">{n}</div>
                    <div className="relative z-10 space-y-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ background: color + '12', border: `1px solid ${color}22` }}>
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-base font-bold text-brand-text">{title}</p>
                        <p className="text-sm text-brand-sub/60 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ════ BENTO FEATURE GRID ════════════════════════════════════ */}
            <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-24 space-y-10">
              <div className="text-center space-y-2">
                <p className="text-[11px] font-bold text-brand-sub/35 uppercase tracking-[0.25em]">The full arsenal</p>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">Not just a scanner.</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

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

                {/* Multilingual pill */}
                <div className="rounded-2xl overflow-hidden flex items-center gap-5 px-6 py-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.07) 0%, #0f0f0f 65%)',
                    border: '1px solid rgba(168,85,247,0.14)',
                  }}>
                  <div className="text-4xl shrink-0">🌐</div>
                  <div>
                    <p className="text-base font-black text-brand-text tracking-tight">12 languages</p>
                    <p className="text-[11px] text-brand-sub/45 mt-1 leading-relaxed tracking-wide">EN ES FR DE PT ZH AR JA KO HI IT RU</p>
                  </div>
                </div>

              </div>
            </section>

            {/* ════ TESTIMONIALS ══════════════════════════════════════════ */}
            <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-24 space-y-10">
              <div className="text-center space-y-2">
                <p className="text-[11px] font-bold text-brand-sub/35 uppercase tracking-[0.25em]">The evidence</p>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">They found out.</h2>
              </div>

              {/* Featured pull quote */}
              <div className="relative rounded-3xl border border-brand-border bg-brand-surface overflow-hidden p-8 sm:p-14"
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
                    style={{ fontSize: 'clamp(20px, 3vw, 28px)', lineHeight: 1.4 }}>
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
                        <p className="text-[10px] text-brand-sub/45 mt-0.5">{t.location} · {t.doc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ════ SCREWED SCORE GAME ════════════════════════════════════ */}
            <ScrewedScoreGame />

            {/* ════ EXAMPLE RESULTS — BENTO ═══════════════════════════════ */}
            <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-24 space-y-10">
              <div className="text-center space-y-2">
                <p className="text-[11px] font-bold text-brand-sub/35 uppercase tracking-[0.25em]">What it looks like</p>
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
                <p className="text-[11px] font-bold text-brand-sub/35 uppercase tracking-[0.25em]">Supported documents</p>
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
            <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-24">
              <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-16 space-y-10 lg:space-y-0">

                {/* Left: heading */}
                <div className="lg:pt-2">
                  <p className="text-[11px] font-bold text-brand-sub/35 uppercase tracking-[0.25em] mb-4">FAQ</p>
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
            <section className="relative overflow-hidden py-28 border-t border-brand-border/20">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full"
                  style={{ background: 'radial-gradient(ellipse 80% 120% at 50% 0%, rgba(255,59,48,0.14) 0%, transparent 60%)' }} />
                <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
              </div>

              <div className="relative max-w-2xl mx-auto px-4 text-center space-y-8">
                <div className="space-y-4">
                  <p className="text-[11px] font-bold text-red-400/60 uppercase tracking-[0.25em]">Start free right now</p>
                  <h2 className="font-black text-brand-text tracking-tighter leading-[0.9]"
                    style={{ fontSize: 'clamp(52px, 9vw, 108px)' }}>
                    Stop wondering.<br />
                    <span style={{
                      background: 'linear-gradient(135deg, #ff8a80, #ff3b30)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Start knowing.</span>
                  </h2>
                  <p className="text-brand-sub/50 text-base max-w-sm mx-auto leading-relaxed">
                    3 free scans. No account. No credit card. If you find something, you'll want to share it.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -inset-6 rounded-3xl -z-10" style={{
                    background: 'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(255,59,48,0.15) 0%, transparent 70%)',
                    filter: 'blur(24px)',
                  }} />
                  <UploadZone onUpload={handleUpload} isLoading={false} />
                </div>

                <p className="flex items-center justify-center gap-2 text-xs text-brand-sub/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500/25" />
                  Documents are never stored permanently or shared with third parties.
                </p>
              </div>
            </section>

          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            LOADING STATE
        ════════════════════════════════════════════════════════════════════ */}
        {isLoading && (
          <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
            <UploadZone onUpload={handleUpload} isLoading />
            <ProgressBar phase={state.phase} progress={state.progress} label={state.progressLabel} />
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            ERROR STATE
        ════════════════════════════════════════════════════════════════════ */}
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

        {/* ════════════════════════════════════════════════════════════════════
            RESULTS STATE
        ════════════════════════════════════════════════════════════════════ */}
        {state.phase === 'done' && state.result && state.analysisId && (
          <div className="max-w-2xl mx-auto px-4 py-10 space-y-4 animate-fade-up">

            {isSample && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-yellow-500/25 bg-yellow-500/5 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-yellow-300">This is a sample result</p>
                  <p className="text-xs text-brand-sub">Upload your own bill or contract to get your real Screwed Score — free, no account needed.</p>
                </div>
                <button onClick={handleReset}
                  className="shrink-0 px-4 py-2 rounded-lg text-sm font-black text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
                  Scan mine
                </button>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={handleReset} className="flex items-center gap-1.5 text-sm text-brand-sub hover:text-brand-text transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-muted/50">
                <RotateCcw className="w-3.5 h-3.5" /> New scan
              </button>
            </div>

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

            {limitReached && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-brand-text">You&apos;ve used your free scans</p>
                  <p className="text-xs text-brand-sub">Unlock unlimited scans for 30 days — one-time payment, no subscription.</p>
                </div>
                <button
                  onClick={() => setShowPaywall(true)}
                  className="shrink-0 px-4 py-2 rounded-lg text-sm font-black text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
                  $2.99
                </button>
              </div>
            )}

            {!isSample && <FightBackKit analysisId={state.analysisId} score={state.result.screwed_score} />}

            <BenchmarkCard
              documentType={state.result.document_type}
              scorePercent={state.result.screwed_score_percent}
              score={state.result.screwed_score}
            />

            {!isSample && <OutcomeReport analysisId={state.analysisId} score={state.result.screwed_score} />}

            <TrustedProviders documentType={state.documentType} score={state.result.screwed_score} />

            <RecommendedProviders
              documentType={state.documentType ?? 'unknown'}
              score={state.result.screwed_score}
            />

            {!isSample && (
              <ShareExperience
                defaultScore={state.result.screwed_score}
                defaultCategory={state.documentType ?? 'unknown'}
                analysisId={state.analysisId}
              />
            )}

            {!isSample && <ReferralCard result={state.result} analysisId={state.analysisId!} />}

            {!isSample && <ContentGenerator analysisId={state.analysisId} isPro={isPro} onUpgrade={() => setShowPaywall(true)} />}

            {!isSample && (
              <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-3"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                <p className="text-sm font-bold text-brand-text">Share your results</p>
                <p className="text-xs text-brand-sub">Your result page is public at a shareable link. No personal info included.</p>
                <ShareButton analysisId={state.analysisId} score={state.result.screwed_score} variant="full" />
              </div>
            )}

            {!isSample && <EmailCapture analysisId={state.analysisId} />}

            <div className="text-center pt-2">
              <button onClick={handleReset}
                className="text-sm text-brand-sub hover:text-brand-text transition-colors flex items-center gap-2 mx-auto">
                <RotateCcw className="w-3.5 h-3.5" /> {isSample ? 'Scan my document' : 'Analyze another document'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Sticky sample CTA ───────────────────────────────────────────────── */}
      {isSample && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4"
          style={{ background: 'linear-gradient(to top, rgba(2,3,8,0.98) 60%, transparent)' }}>
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleReset}
              className="w-full py-4 rounded-2xl font-black text-base tracking-tight transition-all duration-200 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
                boxShadow: '0 0 40px rgba(255,59,48,0.35)',
                color: '#fff',
              }}
            >
              Scan my own bill — it's free →
            </button>
            <p className="text-center text-[11px] mt-2" style={{ color: 'rgba(107,122,153,0.5)' }}>
              No account · No credit card · Files deleted after scan
            </p>
          </div>
        </div>
      )}

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

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
