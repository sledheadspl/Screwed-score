'use client'

import { useState, useCallback } from 'react'
import { UploadZone } from '@/components/UploadZone'
import { ProgressBar } from '@/components/ProgressBar'
import { ScoreCard } from '@/components/ScoreCard'
import { FindingsList } from '@/components/FindingsList'
import { EmailCapture } from '@/components/EmailCapture'
import { ShareButton } from '@/components/ShareButton'
import { RotateCcw, AlertCircle, Receipt, FileText, DollarSign, Sparkles } from 'lucide-react'
import type { AppState, AnalysisResult, UploadResponse, AnalyzeResponse } from '@/lib/types'
import { formatDollar } from '@/lib/utils'

const INITIAL_STATE: AppState = {
  phase: 'idle',
  progress: 0,
  progressLabel: '',
  analysisId: null,
  result: null,
  error: null,
  documentType: null,
}

const RECENT_SCORES = [
  { score: 'SCREWED', doc: 'Mechanic invoice', amount: '$847', time: '2m ago' },
  { score: 'MAYBE',   doc: 'Phone bill',        amount: '$43',  time: '5m ago' },
  { score: 'SCREWED', doc: 'Contractor est.',   amount: '$2,100', time: '11m ago' },
  { score: 'SAFE',    doc: 'Employment contract', amount: '',   time: '18m ago' },
  { score: 'SCREWED', doc: 'Medical bill',      amount: '$1,240', time: '24m ago' },
  { score: 'MAYBE',   doc: 'Lease agreement',   amount: '$310', time: '31m ago' },
]

const SCORE_COLORS: Record<string, string> = {
  SCREWED: 'text-red-400',
  MAYBE:   'text-yellow-400',
  SAFE:    'text-green-400',
}

export default function HomePage() {
  const [state, setState] = useState<AppState>(INITIAL_STATE)

  const setPhase = (phase: AppState['phase'], progress: number, label: string) =>
    setState(s => ({ ...s, phase, progress, progressLabel: label }))

  const handleUpload = useCallback(async (file: File) => {
    setState({ ...INITIAL_STATE, phase: 'uploading', progress: 10, progressLabel: 'Uploading file...' })

    try {
      const form = new FormData()
      form.append('file', file)
      setPhase('uploading', 25, 'Uploading file...')

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        setState(s => ({ ...s, phase: 'error', error: uploadData.error ?? 'Upload failed' }))
        return
      }

      // extracted_text is NOT returned — server fetches it from DB in /api/analyze
      const { document_id, document_type } = uploadData as UploadResponse
      setPhase('parsing', 45, 'Reading your document...')
      await delay(400)
      setPhase('analyzing', 65, 'Running AI analysis...')

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id }),
      })

      setPhase('analyzing', 88, 'Computing your Screwed Score...')

      const analyzeData = await analyzeRes.json()
      if (!analyzeRes.ok) {
        setState(s => ({ ...s, phase: 'error', error: analyzeData.error ?? 'Analysis failed' }))
        return
      }

      const { analysis_id, result } = analyzeData as AnalyzeResponse
      setState(s => ({
        ...s,
        phase: 'done',
        progress: 100,
        progressLabel: 'Done',
        analysisId: analysis_id,
        documentType: document_type,
        result: { ...result, created_at: new Date().toISOString() },
      }))
    } catch (err) {
      setState(s => ({
        ...s,
        phase: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      }))
    }
  }, [])

  const handleReset = () => setState(INITIAL_STATE)
  const isLoading = state.phase === 'uploading' || state.phase === 'parsing' || state.phase === 'analyzing'

  return (
    <div className="min-h-screen bg-brand-bg">

      {/* ── Global ambient glow ─────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(255,59,48,0.15) 0%, transparent 70%)' }} />
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-brand-border/60 bg-brand-bg/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1 select-none">
            <span className="text-base font-black text-brand-text tracking-tight">Get</span>
            <span className="text-base font-black tracking-tight" style={{
              background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Screwed</span>
            <span className="text-base font-black text-brand-text tracking-tight">Score</span>
          </div>

          <div className="flex items-center gap-3">
            {state.phase === 'done' ? (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-brand-sub hover:text-brand-text transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-muted"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New scan
              </button>
            ) : (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-brand-sub">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Free · No account needed
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 relative">

        {/* ── IDLE: Hero ──────────────────────────────────────────────────── */}
        {state.phase === 'idle' && (
          <div className="space-y-8">

            {/* Hero text */}
            <div className="text-center space-y-5 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/20 bg-red-500/8 text-xs text-red-400 font-semibold">
                <Sparkles className="w-3 h-3" />
                Free · No account required
              </div>

              <h1 className="text-5xl sm:text-6xl font-black leading-[0.95] tracking-tighter">
                <span className="text-brand-text">Are you getting</span>
                <br />
                <span style={{
                  background: 'linear-gradient(135deg, #ff6b60 0%, #ff3b30 45%, #cc1a10 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  fontStyle: 'italic',
                }}>
                  screwed?
                </span>
              </h1>

              <p className="text-brand-sub text-lg max-w-sm mx-auto leading-relaxed">
                Upload any bill, invoice, or contract. Get your{' '}
                <span className="text-brand-text font-semibold">Screwed Score</span>{' '}
                in seconds.
              </p>
            </div>

            {/* Upload zone */}
            <div className="animate-fade-up delay-100">
              <UploadZone onUpload={handleUpload} isLoading={false} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 animate-fade-up delay-200">
              {[
                { icon: Receipt, value: '6+', label: 'Document types' },
                { icon: DollarSign, value: '$0', label: 'Cost to analyze' },
                { icon: FileText, value: '~20s', label: 'Time to results' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-xl border border-brand-border bg-brand-surface p-4 text-center space-y-1"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                  <Icon className="w-4 h-4 text-brand-sub mx-auto mb-2" />
                  <p className="text-lg font-black text-brand-text">{value}</p>
                  <p className="text-[11px] text-brand-sub">{label}</p>
                </div>
              ))}
            </div>

            {/* Live feed */}
            <div className="animate-fade-up delay-300 rounded-xl border border-brand-border bg-brand-surface overflow-hidden"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
              <div className="px-4 py-3 border-b border-brand-border flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">Recent scans</span>
              </div>
              <div className="divide-y divide-brand-border">
                {RECENT_SCORES.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-black ${SCORE_COLORS[item.score]}`}>{item.score}</span>
                      <span className="text-xs text-brand-sub">{item.doc}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.amount && (
                        <span className="text-xs font-semibold text-red-400">{item.amount}</span>
                      )}
                      <span className="text-[10px] text-brand-sub/50">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="animate-fade-up delay-400">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { n: '01', title: 'Upload', desc: 'Drop any bill, invoice, contract, or photo' },
                  { n: '02', title: 'Analyze', desc: 'AI scans for red flags and overcharges' },
                  { n: '03', title: 'Act', desc: 'Get your score and know exactly what to do' },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="rounded-xl border border-brand-border bg-brand-surface p-4 space-y-2"
                    style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                    <span className="text-[10px] font-black text-red-500/60 tracking-widest">{n}</span>
                    <p className="text-sm font-bold text-brand-text">{title}</p>
                    <p className="text-xs text-brand-sub leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LOADING ─────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-4">
            <UploadZone onUpload={handleUpload} isLoading />
            <ProgressBar phase={state.phase} progress={state.progress} label={state.progressLabel} />
          </div>
        )}

        {/* ── ERROR ───────────────────────────────────────────────────────── */}
        {state.phase === 'error' && (
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
              <RotateCcw className="w-4 h-4" />
              Try again
            </button>
          </div>
        )}

        {/* ── RESULTS ─────────────────────────────────────────────────────── */}
        {state.phase === 'done' && state.result && state.analysisId && (
          <div className="space-y-4 animate-fade-up">

            {/* Score card — the hero of the results */}
            <ScoreCard result={state.result} analysisId={state.analysisId} />

            {/* Findings */}
            <FindingsList findings={state.result.top_findings} />

            {/* Plain summary */}
            <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-2"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
              <p className="text-[10px] font-semibold text-brand-sub uppercase tracking-widest">Plain English Summary</p>
              <p className="text-sm text-brand-text/75 leading-relaxed">{state.result.plain_summary}</p>
            </div>

            {/* Receipt-style overcharge breakdown */}
            {state.result.overcharge?.line_items?.filter(i => i.flagged).length > 0 && (
              <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                <div className="px-5 py-3 border-b border-brand-border flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">
                    Flagged charges
                  </span>
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
                        {item.flag_reason && (
                          <p className="text-xs text-brand-sub mt-0.5">{item.flag_reason}</p>
                        )}
                        {item.industry_context && (
                          <p className="text-xs text-green-400 mt-0.5">{item.industry_context}</p>
                        )}
                      </div>
                      {item.charged_amount != null && (
                        <span className="font-black text-red-400 tabular-nums shrink-0">
                          ${item.charged_amount.toFixed(0)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share */}
            <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-3"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
              <p className="text-sm font-bold text-brand-text">Share your results</p>
              <p className="text-xs text-brand-sub">Your result page is public at a shareable link. No PII included.</p>
              <ShareButton analysisId={state.analysisId} score={state.result.screwed_score} variant="full" />
            </div>

            {/* Email capture */}
            <EmailCapture analysisId={state.analysisId} />

            {/* Reset */}
            <div className="text-center pt-2">
              <button onClick={handleReset}
                className="text-sm text-brand-sub hover:text-brand-text transition-colors flex items-center gap-2 mx-auto">
                <RotateCcw className="w-3.5 h-3.5" />
                Analyze another document
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-brand-border mt-20 py-6">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs font-black text-brand-text">Get</span>
            <span className="text-xs font-black text-red-400">Screwed</span>
            <span className="text-xs font-black text-brand-text">Score</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-brand-sub">
            <span className="hidden sm:block">Not legal or financial advice</span>
            <a href="/privacy" className="hover:text-brand-text transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-brand-text transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
