import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { FindingsList } from '@/components/FindingsList'
import type { AnalysisResult } from '@/lib/types'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'
import { formatDollar } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight, AlertTriangle, CheckCircle, AlertCircle, Receipt } from 'lucide-react'
import { DisputeLetter } from '@/components/DisputeLetter'
import { BenchmarkCard } from '@/components/BenchmarkCard'

interface Props {
  params: { id: string }
}

async function getAnalysis(id: string): Promise<AnalysisResult | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error || !data) return null
  supabase.rpc('increment_share_views', { analysis_id: id }).then(() => {})

  return {
    id: data.id,
    document_type: data.document_type,
    screwed_score: data.screwed_score,
    screwed_score_percent: data.screwed_score_percent,
    screwed_score_reason: data.screwed_score_reason,
    language: data.language ?? 'en',
    top_findings: data.top_findings ?? [],
    overcharge: data.overcharge_output ?? {},
    contract_guard: data.contract_guard_output ?? {},
    plain_summary: data.plain_summary ?? '',
    what_they_tried: data.what_they_tried ?? [],
    what_to_do_next: data.what_to_do_next ?? [],
    created_at: data.created_at,
    is_public: data.is_public,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const analysis = await getAnalysis(params.id)
  if (!analysis) return { title: 'Analysis not found — GetScrewedScore' }

  const docLabel = DOCUMENT_TYPE_LABELS[analysis.document_type]
  const flagged = analysis.overcharge?.total_flagged_amount ?? 0
  const amountText = flagged > 0 ? ` — $${Math.round(flagged).toLocaleString()} flagged` : ''

  const title =
    analysis.screwed_score === 'SCREWED' ? `🚨 SCREWED on their ${docLabel}${amountText}` :
    analysis.screwed_score === 'MAYBE'   ? `⚠️ Suspicious charges on their ${docLabel}${amountText}` :
                                           `✅ Clean ${docLabel} — no red flags found`

  const reason = analysis.screwed_score_reason ?? ''
  const description = reason.slice(0, 155)
  const ogUrl = `/og?score=${analysis.screwed_score}&percent=${analysis.screwed_score_percent}&type=${encodeURIComponent(docLabel)}&amount=${Math.round(flagged)}&reason=${encodeURIComponent(reason.slice(0, 80))}`

  return {
    title: `${title} | GetScrewedScore`,
    description,
    openGraph: {
      title, description,
      url: `https://screwedscore.com/r/${params.id}`,
      type: 'website',
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogUrl] },
    robots: { index: false, follow: false },
  }
}

const SCORE_CONFIG = {
  SCREWED: {
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    badgeClass: 'bg-red-500/10 border-red-500/30 text-red-400',
    glowColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.25)',
    heroPrefix: (doc: string) => `This ${doc} is trying to steal from them`,
    ctaQuestion: (doc: string) => `Is YOUR ${doc} ripping you off?`,
  },
  MAYBE: {
    icon: AlertCircle,
    iconColor: 'text-yellow-400',
    badgeClass: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    glowColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.2)',
    heroPrefix: (doc: string) => `Suspicious charges found on this ${doc}`,
    ctaQuestion: (doc: string) => `Does YOUR ${doc} have hidden charges?`,
  },
  SAFE: {
    icon: CheckCircle,
    iconColor: 'text-green-400',
    badgeClass: 'bg-green-500/10 border-green-500/30 text-green-400',
    glowColor: 'rgba(74,222,128,0.08)',
    borderColor: 'rgba(74,222,128,0.15)',
    heroPrefix: (doc: string) => `This ${doc} is clean — no red flags`,
    ctaQuestion: (doc: string) => `Is YOUR ${doc} this clean?`,
  },
}

export default async function SharePage({ params }: Props) {
  const analysis = await getAnalysis(params.id)
  if (!analysis) notFound()

  const cfg = SCORE_CONFIG[analysis.screwed_score]
  const ScoreIcon = cfg.icon
  const docLabel = DOCUMENT_TYPE_LABELS[analysis.document_type].toLowerCase()
  const flagged = analysis.overcharge?.total_flagged_amount ?? 0
  const flaggedItems = (analysis.overcharge?.line_items ?? [])
    .filter((i: { flagged: boolean }) => i.flagged)
    .slice(0, 4)

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full"
          style={{ background: `radial-gradient(ellipse, ${cfg.glowColor} 0%, transparent 70%)` }} />
      </div>

      <nav className="sticky top-0 z-50 border-b border-brand-border/60 bg-brand-bg/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 select-none">
            <span className="text-base font-black text-brand-text">Get</span>
            <span className="text-base font-black" style={{
              background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Screwed</span>
            <span className="text-base font-black text-brand-text">Score</span>
          </Link>
          <Link href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)', boxShadow: '0 0 20px rgba(255,59,48,0.3)' }}>
            Check mine <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-5 relative">

        {/* Hero */}
        <div className="rounded-2xl border overflow-hidden animate-fade-up"
          style={{ borderColor: cfg.borderColor, background: `linear-gradient(135deg, ${cfg.glowColor} 0%, rgba(13,13,15,0.8) 100%)`, boxShadow: `0 0 60px ${cfg.glowColor}` }}>
          <div className="p-7 space-y-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-lg tracking-wide ${cfg.badgeClass}`}>
                <ScoreIcon className={`w-5 h-5 ${cfg.iconColor}`} />
                {analysis.screwed_score}
              </div>
              <span className="text-sm text-brand-sub capitalize">{docLabel}</span>
              <span className="text-xs text-brand-sub/50 ml-auto">
                {new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            {flagged > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-brand-sub uppercase tracking-widest">Amount flagged</p>
                <p className="text-5xl font-black text-red-400 leading-none tracking-tighter">
                  {formatDollar(flagged)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-brand-text leading-tight">
                {cfg.heroPrefix(docLabel)}
              </h1>
              <p className="text-sm text-brand-sub/80 leading-relaxed">{analysis.screwed_score_reason}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[11px] text-brand-sub">
                <span>Screwed Score</span>
                <span className={`font-bold ${cfg.iconColor}`}>{analysis.screwed_score_percent}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-brand-muted overflow-hidden">
                <div className="h-full rounded-full"
                  style={{
                    width: `${analysis.screwed_score_percent}%`,
                    background: analysis.screwed_score === 'SCREWED' ? 'linear-gradient(90deg, #f87171, #ef4444)' :
                                analysis.screwed_score === 'MAYBE'   ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' :
                                                                       'linear-gradient(90deg, #4ade80, #22c55e)',
                  }} />
              </div>
            </div>
          </div>
        </div>

        {/* Flagged line items */}
        {flaggedItems.length > 0 && (
          <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden animate-fade-up delay-100"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
            <div className="px-5 py-3 border-b border-brand-border flex items-center gap-2">
              <Receipt className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">What they got charged for</span>
            </div>
            <div className="divide-y divide-brand-border">
              {flaggedItems.map((item: { description: string; charged_amount: number | null; flag_reason?: string | null }, i: number) => (
                <div key={i} className="px-5 py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-text truncate">{item.description}</p>
                    {item.flag_reason && <p className="text-xs text-red-400/80 mt-0.5">{item.flag_reason}</p>}
                  </div>
                  {item.charged_amount != null && (
                    <span className="text-sm font-black text-red-400 shrink-0">${item.charged_amount.toFixed(0)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top findings */}
        {analysis.top_findings?.length > 0 && (
          <div className="animate-fade-up delay-200">
            <FindingsList findings={analysis.top_findings} maxVisible={3} />
          </div>
        )}

        {/* THE CTA */}
        <div className="animate-fade-up delay-300 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,59,48,0.1) 0%, rgba(255,59,48,0.04) 100%)',
            border: '1px solid rgba(255,59,48,0.25)',
            boxShadow: '0 0 60px rgba(255,59,48,0.1)',
          }}>
          <div className="p-8 text-center space-y-6">
            <div className="space-y-3">
              <p className="text-2xl font-black text-brand-text leading-tight">
                {cfg.ctaQuestion(docLabel.charAt(0).toUpperCase() + docLabel.slice(1))}
              </p>
              <p className="text-sm text-brand-sub max-w-xs mx-auto leading-relaxed">
                Upload yours free. No account needed. Results in ~20 seconds.
              </p>
            </div>
            <Link href="/"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-black text-white text-base transition-all hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
                boxShadow: '0 0 40px rgba(255,59,48,0.45)',
              }}>
              Get My Screwed Score — Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="flex items-center justify-center gap-6 text-xs text-brand-sub/50">
              <span>✓ No account</span>
              <span>✓ No credit card</span>
              <span>✓ 20 seconds</span>
            </div>
          </div>
        </div>

        {/* Benchmark comparison */}
        <div className="animate-fade-up delay-400">
          <BenchmarkCard
            documentType={analysis.document_type}
            scorePercent={analysis.screwed_score_percent}
            score={analysis.screwed_score}
          />
        </div>

        {/* Dispute letter */}
        <div className="animate-fade-up delay-400">
          <DisputeLetter analysisId={analysis.id} score={analysis.screwed_score} />
        </div>

        {/* What to do next */}
        {analysis.what_to_do_next?.length > 0 && (
          <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-3 animate-fade-up delay-400"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
            <p className="text-[10px] font-semibold text-brand-sub uppercase tracking-widest">What they should do next</p>
            <ul className="space-y-2">
              {analysis.what_to_do_next.slice(0, 4).map((step: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-brand-sub">
                  <span className="text-[10px] font-black text-red-500/60 mt-1 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <footer className="border-t border-brand-border mt-16 py-6">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between text-xs text-brand-sub">
          <span>© {new Date().getFullYear()} GetScrewedScore · Not legal or financial advice</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-brand-text transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-brand-text transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
