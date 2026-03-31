'use client'

import { useEffect, useState } from 'react'
import { formatDollar } from '@/lib/utils'
import type { AnalysisResult, ScrewedScore } from '@/lib/types'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'
import { ShareButton } from './ShareButton'
import { TrendingUp, AlertTriangle, CheckCircle, Shield } from 'lucide-react'

interface ScoreCardProps {
  result: AnalysisResult
  analysisId: string
  isPublic?: boolean
}

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese',
  zh: 'Chinese', ar: 'Arabic', ja: 'Japanese', ko: 'Korean',
  hi: 'Hindi', it: 'Italian', ru: 'Russian', nl: 'Dutch',
}

const SCORE_CONFIG = {
  SCREWED: {
    label: 'SCREWED',
    emoji: '🚨',
    scoreClass: 'score-text-screwed',
    glowClass: 'glow-red',
    textGlow: 'text-glow-red',
    borderColor: 'border-red-500/30',
    bgGradient: 'from-red-950/40 via-transparent to-transparent',
    radialGlow: 'rgba(255,59,48,0.12)',
    barColor: 'from-red-700 via-red-500 to-red-400',
    badgeClass: 'bg-red-500/15 border-red-500/30 text-red-400',
    pulseClass: 'pulse-glow-red',
    tagline: "They were really trying it.",
    icon: AlertTriangle,
    iconColor: 'text-red-400',
  },
  MAYBE: {
    label: 'MAYBE',
    emoji: '⚠️',
    scoreClass: 'score-text-maybe',
    glowClass: 'glow-yellow',
    textGlow: 'text-glow-yellow',
    borderColor: 'border-yellow-500/30',
    bgGradient: 'from-yellow-950/30 via-transparent to-transparent',
    radialGlow: 'rgba(255,214,10,0.08)',
    barColor: 'from-yellow-700 via-yellow-500 to-yellow-400',
    badgeClass: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
    pulseClass: 'pulse-glow-yellow',
    tagline: "Worth a closer look.",
    icon: TrendingUp,
    iconColor: 'text-yellow-400',
  },
  SAFE: {
    label: 'SAFE',
    emoji: '✅',
    scoreClass: 'score-text-safe',
    glowClass: 'glow-green',
    textGlow: 'text-glow-green',
    borderColor: 'border-green-500/30',
    bgGradient: 'from-green-950/25 via-transparent to-transparent',
    radialGlow: 'rgba(48,209,88,0.08)',
    barColor: 'from-green-700 via-green-500 to-green-400',
    badgeClass: 'bg-green-500/15 border-green-500/30 text-green-400',
    pulseClass: '',
    tagline: "Looks clean. Nice.",
    icon: CheckCircle,
    iconColor: 'text-green-400',
  },
}

export function ScoreCard({ result, analysisId, isPublic = false }: ScoreCardProps) {
  const [gaugeWidth, setGaugeWidth] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const cfg = SCORE_CONFIG[result.screwed_score]
  const Icon = cfg.icon
  const totalFlagged = result.overcharge?.total_flagged_amount ?? 0
  const highCount = result.top_findings.filter(f => f.severity === 'high').length

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 100)
    const t2 = setTimeout(() => setGaugeWidth(result.screwed_score_percent), 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [result.screwed_score_percent])

  return (
    <div className="space-y-4">

      {/* ── Main Score Block ───────────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden rounded-2xl border ${cfg.borderColor} bg-brand-surface`}
        style={{ boxShadow: `0 0 60px ${cfg.radialGlow}, inset 0 1px 0 rgba(255,255,255,0.04)` }}
      >
        {/* Radial background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${cfg.radialGlow}, transparent)` }}
        />

        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative p-6 sm:p-8 space-y-5">

          {/* Doc type badge + language */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.badgeClass}`}>
                <Icon className="w-3 h-3" />
                {DOCUMENT_TYPE_LABELS[result.document_type]}
              </span>
              {result.language && result.language !== 'en' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-blue-500/30 bg-blue-500/10 text-blue-400">
                  🌐 Analyzed in {LANGUAGE_NAMES[result.language] ?? result.language.toUpperCase()}
                </span>
              )}
            </div>
            {!isPublic && <ShareButton analysisId={analysisId} score={result.screwed_score} />}
          </div>

          {/* Score reveal */}
          <div className="text-center space-y-2">
            <div
              className={`text-[80px] sm:text-[100px] font-black leading-none tracking-tighter ${cfg.scoreClass} ${cfg.textGlow} ${revealed ? 'animate-score' : 'opacity-0'}`}
              style={{ fontStyle: 'italic' }}
            >
              {cfg.label}
            </div>
            <p className={`text-sm font-medium ${cfg.iconColor}`}>{cfg.tagline}</p>
          </div>

          {/* Gauge */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-brand-sub">
              <span>Risk level</span>
              <span className={`font-bold tabular-nums ${cfg.iconColor}`}>{result.screwed_score_percent}%</span>
            </div>
            <div className="h-2 w-full bg-brand-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${cfg.barColor} transition-all duration-1000 ease-out`}
                style={{ width: `${gaugeWidth}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-brand-sub/50">
              <span>Safe</span>
              <span>Screwed</span>
            </div>
          </div>

          {/* Reason */}
          <p className="text-sm text-brand-text/70 leading-relaxed text-center max-w-sm mx-auto">
            {result.screwed_score_reason}
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <StatPill
              value={result.top_findings.length.toString()}
              label="Total findings"
              highlight={result.top_findings.length > 3}
              color="red"
            />
            <StatPill
              value={highCount.toString()}
              label="High severity"
              highlight={highCount > 1}
              color="red"
            />
            <StatPill
              value={totalFlagged > 0 ? formatDollar(totalFlagged) : '—'}
              label="Flagged charges"
              highlight={totalFlagged > 200}
              color="red"
            />
          </div>
        </div>
      </div>

      {/* ── What They Tried ──────────────────────────────────────────────────── */}
      {result.what_they_tried.length > 0 && (
        <div className={`rounded-2xl border ${cfg.borderColor} bg-brand-surface overflow-hidden`}
          style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)` }}>
          <div className={`px-5 py-3 border-b ${cfg.borderColor} flex items-center gap-2`}>
            <AlertTriangle className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
            <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">
              What they tried
            </span>
          </div>
          <div className="p-5 space-y-3">
            {result.what_they_tried.map((item, i) => (
              <div key={i} className="flex gap-3 items-start group">
                <span className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${cfg.badgeClass} border`}>
                  {i + 1}
                </span>
                <p className="text-sm text-brand-text/80 leading-relaxed group-hover:text-brand-text transition-colors">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── What To Do ───────────────────────────────────────────────────────── */}
      {result.what_to_do_next.length > 0 && (
        <div className="rounded-2xl border border-green-500/20 bg-green-950/10 overflow-hidden"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          <div className="px-5 py-3 border-b border-green-500/15 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">
              What to do next
            </span>
          </div>
          <div className="p-5 space-y-3">
            {result.what_to_do_next.map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="mt-1 w-5 h-5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 flex items-center justify-center text-[10px] font-black shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-brand-text/80 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatPill({ value, label, highlight, color }: {
  value: string; label: string; highlight: boolean; color: string
}) {
  return (
    <div className={`rounded-xl p-3 text-center border transition-all ${
      highlight
        ? 'bg-red-500/10 border-red-500/20'
        : 'bg-brand-muted/40 border-brand-border'
    }`}>
      <div className={`text-lg font-black tabular-nums leading-none ${
        highlight ? 'text-red-400' : 'text-brand-text'
      }`}>{value}</div>
      <div className="text-[10px] text-brand-sub mt-1 leading-tight">{label}</div>
    </div>
  )
}
