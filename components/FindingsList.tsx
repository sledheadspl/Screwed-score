'use client'

import { useState } from 'react'
import { ChevronDown, DollarSign, FileWarning, AlertTriangle, Info } from 'lucide-react'
import { cn, formatDollar } from '@/lib/utils'
import type { Finding } from '@/lib/types'

interface FindingsListProps {
  findings: Finding[]
  maxVisible?: number
}

const CATEGORY_LABELS: Record<Finding['category'], string> = {
  overcharge: 'Overcharge',
  vague_terms: 'Vague Terms',
  duplicate_charge: 'Duplicate',
  risky_clause: 'Risky Clause',
  missing_protection: 'Missing Protection',
  deceptive_language: 'Deceptive',
}

const SEVERITY_CONFIG = {
  high: {
    border: 'border-red-500/25',
    bg: 'bg-red-500/8',
    badgeBg: 'bg-red-500/15 text-red-400 border-red-500/25',
    dot: 'bg-red-500',
    text: 'text-red-400',
    icon: AlertTriangle,
    label: 'High Risk',
  },
  medium: {
    border: 'border-yellow-500/25',
    bg: 'bg-yellow-500/5',
    badgeBg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    dot: 'bg-yellow-400',
    text: 'text-yellow-400',
    icon: FileWarning,
    label: 'Medium',
  },
  low: {
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/5',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-400',
    text: 'text-blue-400',
    icon: Info,
    label: 'Low',
  },
}

export function FindingsList({ findings, maxVisible = 6 }: FindingsListProps) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)

  const visible = showAll ? findings : findings.slice(0, maxVisible)
  const hasMore = findings.length > maxVisible

  if (findings.length === 0) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-950/10 p-8 text-center space-y-2">
        <p className="text-2xl">✅</p>
        <p className="font-bold text-green-400">No major issues found</p>
        <p className="text-sm text-brand-sub">This document looks clean. Still read the fine print.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">
          Findings
        </span>
        <div className="flex items-center gap-3 text-xs">
          {findings.filter(f => f.severity === 'high').length > 0 && (
            <span className="flex items-center gap-1.5 text-red-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              {findings.filter(f => f.severity === 'high').length} high
            </span>
          )}
          {findings.filter(f => f.severity === 'medium').length > 0 && (
            <span className="flex items-center gap-1.5 text-yellow-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
              {findings.filter(f => f.severity === 'medium').length} medium
            </span>
          )}
        </div>
      </div>

      {visible.map((finding, i) => {
        const cfg = SEVERITY_CONFIG[finding.severity]
        const Icon = cfg.icon
        const isOpen = expanded === i

        return (
          <div
            key={i}
            className={cn(
              'rounded-xl border overflow-hidden transition-all duration-200',
              cfg.border, cfg.bg
            )}
            style={{ boxShadow: isOpen ? `inset 0 1px 0 rgba(255,255,255,0.04)` : undefined }}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              {/* Severity dot */}
              <div className={cn('w-1.5 mt-2 self-stretch rounded-full shrink-0', cfg.dot)} />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-brand-text leading-snug">{finding.title}</p>
                  {finding.dollar_impact != null && finding.dollar_impact > 0 && (
                    <span className="shrink-0 flex items-center gap-1 text-red-400 font-black text-sm tabular-nums">
                      <DollarSign className="w-3 h-3" />
                      {finding.dollar_impact.toFixed(0)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', cfg.badgeBg)}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-brand-sub font-medium">
                    {CATEGORY_LABELS[finding.category]}
                  </span>
                </div>
                {!isOpen && (
                  <p className="text-xs text-brand-sub line-clamp-1 mt-0.5">{finding.description}</p>
                )}
              </div>

              <ChevronDown className={cn(
                'w-4 h-4 text-brand-sub shrink-0 mt-0.5 transition-transform duration-200',
                isOpen && 'rotate-180'
              )} />
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3 ml-4">
                <p className="text-sm text-brand-text/75 leading-relaxed">{finding.description}</p>

                {finding.original_text && (
                  <div className="rounded-lg bg-brand-bg/70 border border-brand-border p-3">
                    <p className="text-[10px] text-brand-sub uppercase tracking-wider mb-1.5">Original text</p>
                    <p className="text-[11px] text-brand-sub font-mono leading-relaxed">{finding.original_text}</p>
                  </div>
                )}

                {finding.suggested_fix && (
                  <div className="rounded-lg bg-green-950/20 border border-green-500/20 p-3">
                    <p className="text-[10px] text-green-400 uppercase tracking-wider mb-1.5">What to do</p>
                    <p className="text-xs text-brand-text/70 leading-relaxed">{finding.suggested_fix}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-3 text-sm text-brand-sub hover:text-brand-text border border-brand-border rounded-xl transition-all hover:border-brand-muted hover:bg-brand-surface2 font-medium"
        >
          {showAll
            ? 'Show fewer findings'
            : `Show ${findings.length - maxVisible} more findings`}
        </button>
      )}
    </div>
  )
}
