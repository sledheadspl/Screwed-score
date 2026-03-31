'use client'

import { useState } from 'react'
import { Gift, Copy, Check, Users } from 'lucide-react'
import type { AnalysisResult } from '@/lib/types'

interface ReferralCardProps {
  result: AnalysisResult
  analysisId: string
}

const SCORE_MESSAGES: Record<string, string> = {
  SCREWED: "You just dodged a bullet. Send your friend the same protection — free.",
  MAYBE:   "You caught something they wouldn't have. Give a friend the same heads-up — free.",
  SAFE:    "Your doc was clean. Make sure your friends' are too — give them a free scan.",
}

export function ReferralCard({ result, analysisId }: ReferralCardProps) {
  const [url, setUrl]         = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)

  const handleGenerate = async () => {
    if (url) { copyUrl(url); return }
    setLoading(true)
    try {
      const res = await fetch('/api/referral', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analysis_id: analysisId }),
      })
      const data = await res.json()
      if (data.url) {
        setUrl(data.url)
        copyUrl(data.url)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const copyUrl = async (u: string) => {
    await navigator.clipboard.writeText(u)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const borderColor = result.screwed_score === 'SCREWED' ? 'border-red-500/20'
    : result.screwed_score === 'MAYBE' ? 'border-yellow-500/20'
    : 'border-green-500/20'

  return (
    <div className={`rounded-2xl border ${borderColor} bg-brand-surface overflow-hidden`}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Gift className="w-4.5 h-4.5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-brand-text leading-tight">Give a friend a free scan</p>
            <p className="text-xs text-brand-sub mt-0.5 leading-relaxed">
              {SCORE_MESSAGES[result.screwed_score]}
            </p>
          </div>
        </div>

        {/* Link display */}
        {url && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-muted border border-brand-border">
            <span className="text-xs text-brand-sub font-mono flex-1 truncate">{url}</span>
          </div>
        )}

        {/* CTA button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-lg shadow-purple-500/20 disabled:opacity-60"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
          ) : copied ? (
            <><Check className="w-4 h-4" /> Link copied!</>
          ) : url ? (
            <><Copy className="w-4 h-4" /> Copy link again</>
          ) : (
            <><Users className="w-4 h-4" /> Generate free scan link</>
          )}
        </button>

        <p className="text-[11px] text-brand-sub/40 text-center">
          One-use link · works for any document type
        </p>
      </div>
    </div>
  )
}
