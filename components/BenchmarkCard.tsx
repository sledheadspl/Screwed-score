'use client'

import { useEffect, useState } from 'react'
import { BarChart2 } from 'lucide-react'
import type { DocumentType } from '@/lib/types'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'
import type { BenchmarkData } from '@/pages/api/benchmarks'

interface Props {
  documentType: DocumentType
  scorePercent: number
  score: 'SCREWED' | 'MAYBE' | 'SAFE'
}

export function BenchmarkCard({ documentType, scorePercent, score }: Props) {
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null)

  useEffect(() => {
    fetch(`/api/benchmarks?type=${documentType}`)
      .then(r => r.json())
      .then(d => { if (d.benchmark) setBenchmark(d.benchmark) })
      .catch(() => {})
  }, [documentType])

  if (!benchmark) return null

  const docLabel = DOCUMENT_TYPE_LABELS[documentType]

  // What % of docs is this score worse than, based on score distribution
  const percentileWorstEnd =
    score === 'SCREWED' ? benchmark.safe_pct + benchmark.maybe_pct :
    score === 'MAYBE'   ? benchmark.safe_pct :
                          0

  // How does this score compare to average?
  const diff   = scorePercent - benchmark.avg_percent
  const higher = diff > 0

  // Marker position on the bar (0-100%)
  const markerPos = Math.min(Math.max(scorePercent, 2), 98)

  const scoreColor =
    score === 'SCREWED' ? 'text-red-400' :
    score === 'MAYBE'   ? 'text-yellow-400' :
                          'text-green-400'

  const headline =
    score === 'SCREWED'
      ? `This ${docLabel.toLowerCase()} is worse than ${percentileWorstEnd}% of what we've seen`
      : score === 'MAYBE'
      ? `This ${docLabel.toLowerCase()} has more issues than ${percentileWorstEnd}% of similar docs`
      : `This ${docLabel.toLowerCase()} is cleaner than ${100 - percentileWorstEnd}% of what we've seen`

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>

      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-brand-sub" />
        <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">
          How This Compares
        </span>
      </div>

      <p className="font-bold text-brand-text leading-snug">{headline}</p>

      {/* Score distribution bar */}
      <div className="space-y-2">
        <div className="relative">
          {/* Distribution bar */}
          <div className="flex h-3 rounded-full overflow-hidden">
            <div className="bg-green-500/60" style={{ width: `${benchmark.safe_pct}%` }} />
            <div className="bg-yellow-500/60" style={{ width: `${benchmark.maybe_pct}%` }} />
            <div className="bg-red-500/60"   style={{ width: `${benchmark.screwed_pct}%` }} />
          </div>
          {/* Your score marker */}
          <div
            className="absolute -top-0.5 w-1 h-4 rounded-full bg-white shadow-lg shadow-black/40"
            style={{ left: `${markerPos}%`, transform: 'translateX(-50%)' }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-brand-sub/60">
          <span>Clean</span>
          <span
            className={`text-[11px] font-black ${scoreColor}`}
            style={{ position: 'relative', left: `calc(${markerPos}% - 20px)` }}>
            You
          </span>
          <span>Most screwed</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="text-center space-y-0.5">
          <p className={`text-xl font-black ${scoreColor}`}>{scorePercent}%</p>
          <p className="text-[10px] text-brand-sub">Your score</p>
        </div>
        <div className="text-center space-y-0.5 border-x border-brand-border">
          <p className="text-xl font-black text-brand-text">{benchmark.avg_percent}%</p>
          <p className="text-[10px] text-brand-sub">Avg score</p>
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-xl font-black text-red-400">{benchmark.screwed_pct}%</p>
          <p className="text-[10px] text-brand-sub">Get SCREWED</p>
        </div>
      </div>

      {/* Comparison callout */}
      <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-center ${
        higher
          ? 'bg-red-500/10 text-red-400'
          : 'bg-green-500/10 text-green-400'
      }`}>
        {higher
          ? `${Math.abs(diff)} points above average — out of ${benchmark.total.toLocaleString()} ${docLabel.toLowerCase()}s analyzed`
          : diff === 0
          ? `Right at the average across ${benchmark.total.toLocaleString()} ${docLabel.toLowerCase()}s analyzed`
          : `${Math.abs(diff)} points below average — better than most out of ${benchmark.total.toLocaleString()} analyzed`
        }
      </div>
    </div>
  )
}
