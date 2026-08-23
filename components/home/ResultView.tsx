'use client'

import dynamic from 'next/dynamic'
import { RotateCcw, Receipt } from 'lucide-react'
import type { AnalysisResult, DocumentType } from '@/lib/types'
import { formatDollar } from '@/lib/utils'

// Done-state components. This whole module is itself loaded on demand by
// AnalysisShell, so none of it — nor the cards below — is in the landing chunk.
const ScoreCard            = dynamic(() => import('@/components/ScoreCard').then(m => m.ScoreCard),                       { ssr: false })
const FindingsList         = dynamic(() => import('@/components/FindingsList').then(m => m.FindingsList),                 { ssr: false })
const EmailCapture         = dynamic(() => import('@/components/EmailCapture').then(m => m.EmailCapture),                 { ssr: false })
const ShareButton          = dynamic(() => import('@/components/ShareButton').then(m => m.ShareButton),                   { ssr: false })
const ContentGenerator     = dynamic(() => import('@/components/ContentGenerator').then(m => m.ContentGenerator),         { ssr: false })
const TrustedProviders     = dynamic(() => import('@/components/TrustedProviders').then(m => m.TrustedProviders),         { ssr: false })
const RecommendedProviders = dynamic(() => import('@/components/RecommendedProviders').then(m => m.RecommendedProviders), { ssr: false })
const ShareExperience      = dynamic(() => import('@/components/ShareExperience').then(m => m.ShareExperience),           { ssr: false })
const ReferralCard         = dynamic(() => import('@/components/ReferralCard').then(m => m.ReferralCard),                 { ssr: false })
const BenchmarkCard        = dynamic(() => import('@/components/BenchmarkCard').then(m => m.BenchmarkCard),               { ssr: false })
const OutcomeReport        = dynamic(() => import('@/components/OutcomeReport').then(m => m.OutcomeReport),               { ssr: false })
const FightBackKit         = dynamic(() => import('@/components/FightBackKit').then(m => m.FightBackKit),                 { ssr: false })
const HumanAuditCard       = dynamic(() => import('@/components/HumanAuditCard').then(m => m.HumanAuditCard),             { ssr: false })
const FixDocument          = dynamic(() => import('@/components/FixDocument').then(m => m.FixDocument),                   { ssr: false })

interface ResultViewProps {
  result: AnalysisResult
  analysisId: string
  documentType: DocumentType | null
  isSample: boolean
  isPro: boolean
  userEmail: string | null
  onReset: () => void
  onUpgrade: () => void
}

export function ResultView({
  result, analysisId, documentType, isSample, isPro, userEmail, onReset, onUpgrade,
}: ResultViewProps) {
  const flagged = result.overcharge?.line_items?.filter(i => i.flagged) ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4 animate-fade-up">

      {isSample && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-yellow-500/25 bg-yellow-500/5 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-yellow-300">This is a sample result</p>
            <p className="text-xs text-brand-sub">Upload your own bill or contract to get your real Screwed Score — free, no account needed.</p>
          </div>
          <button onClick={onReset}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-black text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
            Scan mine
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onReset} className="flex items-center gap-1.5 text-sm text-brand-sub hover:text-brand-text transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-muted/50">
          <RotateCcw className="w-3.5 h-3.5" /> New scan
        </button>
      </div>

      <ScoreCard result={result} analysisId={analysisId} />
      <FindingsList findings={result.top_findings} />

      <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-2"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        <p className="text-[10px] font-semibold text-brand-sub uppercase tracking-widest">Plain English Summary</p>
        <p className="text-sm text-brand-text/75 leading-relaxed">{result.plain_summary}</p>
      </div>

      {flagged.length > 0 && (
        <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          <div className="px-5 py-3 border-b border-brand-border flex items-center gap-2">
            <Receipt className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">Flagged charges</span>
            {result.overcharge.total_flagged_amount > 0 && (
              <span className="ml-auto text-sm font-black text-red-400">
                {formatDollar(result.overcharge.total_flagged_amount)} flagged
              </span>
            )}
          </div>
          <div className="p-5">
            {flagged.map((item, i) => (
              <div key={i} className="receipt-item">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="text-sm font-medium text-brand-text truncate">{item.description}</p>
                  {item.flag_reason && <p className="text-xs text-brand-sub mt-0.5">{item.flag_reason}</p>}
                  {/* A real industry benchmark and an unbenchmarked hunch must not
                      look alike. Green reads as verified, so only a benchmarked
                      comparison gets it; everything else is muted and labelled. */}
                  {item.industry_context && (
                    item.benchmark_confidence === 'benchmarked' ? (
                      <p className="text-xs text-green-400 mt-0.5">{item.industry_context}</p>
                    ) : (
                      <p className="text-xs text-brand-sub/80 mt-0.5 italic">
                        No confirmed baseline — {item.industry_context}
                      </p>
                    )
                  )}
                </div>
                {item.charged_amount != null && (
                  <span className="font-black text-red-400 tabular-nums shrink-0">${item.charged_amount.toFixed(0)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSample && <FixDocument result={result} />}
      {!isSample && <FightBackKit analysisId={analysisId} score={result.screwed_score} />}

      {!isSample && (
        <HumanAuditCard
          analysisId={analysisId}
          documentType={result.document_type}
          scorePercent={result.screwed_score_percent}
          userEmail={userEmail}
        />
      )}

      <BenchmarkCard
        documentType={result.document_type}
        scorePercent={result.screwed_score_percent}
        score={result.screwed_score}
      />

      {!isSample && <OutcomeReport analysisId={analysisId} score={result.screwed_score} />}

      <TrustedProviders documentType={documentType} score={result.screwed_score} />

      <RecommendedProviders
        documentType={documentType ?? 'unknown'}
        score={result.screwed_score}
      />

      {!isSample && (
        <ShareExperience
          defaultScore={result.screwed_score}
          defaultCategory={documentType ?? 'unknown'}
          analysisId={analysisId}
        />
      )}

      {!isSample && <ReferralCard result={result} analysisId={analysisId} />}

      {!isSample && <ContentGenerator analysisId={analysisId} isPro={isPro} onUpgrade={onUpgrade} />}

      {!isSample && (
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-3"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          <p className="text-sm font-bold text-brand-text">Share your results</p>
          <p className="text-xs text-brand-sub">Your result page is public at a shareable link. No personal info included.</p>
          <ShareButton analysisId={analysisId} score={result.screwed_score} variant="full" result={result} />
        </div>
      )}

      {!isSample && <EmailCapture analysisId={analysisId} />}

      <div className="text-center pt-2">
        <button onClick={onReset}
          className="text-sm text-brand-sub hover:text-brand-text transition-colors flex items-center gap-2 mx-auto">
          <RotateCcw className="w-3.5 h-3.5" /> {isSample ? 'Scan my document' : 'Analyze another document'}
        </button>
      </div>
    </div>
  )
}

export default ResultView
