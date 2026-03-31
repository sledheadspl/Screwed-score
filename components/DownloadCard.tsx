'use client'

import { useState } from 'react'
import { Download, Copy, Check } from 'lucide-react'
import type { AnalysisResult } from '@/lib/types'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'

interface DownloadCardProps {
  result: AnalysisResult
  analysisId: string
}

function buildCardUrl(result: AnalysisResult): string {
  const params = new URLSearchParams({
    score:   result.screwed_score,
    percent: String(result.screwed_score_percent),
    type:    DOCUMENT_TYPE_LABELS[result.document_type],
    amount:  String(result.overcharge?.total_flagged_amount ?? 0),
  })
  const findings = result.what_they_tried ?? []
  if (findings[0]) params.set('f1', findings[0])
  if (findings[1]) params.set('f2', findings[1])
  return `/share-card?${params.toString()}`
}

function buildCaption(result: AnalysisResult, analysisId: string): string {
  const amount = result.overcharge?.total_flagged_amount ?? 0
  const doc = DOCUMENT_TYPE_LABELS[result.document_type]
  const url = `https://screwedscore.com/r/${analysisId}`

  if (result.screwed_score === 'SCREWED' && amount > 0) {
    return `🚨 Just ran my ${doc} through AI and it flagged $${amount.toLocaleString()} in charges I shouldn't have paid.\n\nGot a SCREWED score on GetScrewedScore. Check yours before you pay.\n\n${url}\n\n#ScrewedScore #DontGetScrewed #ConsumerRights`
  }
  if (result.screwed_score === 'SCREWED') {
    return `🚨 My ${doc} just got a SCREWED score on GetScrewedScore. There were red flags I never would've caught.\n\nCheck yours free:\n${url}\n\n#ScrewedScore #DontGetScrewed`
  }
  if (result.screwed_score === 'MAYBE') {
    return `⚠️ AI flagged some suspicious charges on my ${doc}. Got a MAYBE score on GetScrewedScore — worth a closer look.\n\nCheck yours:\n${url}\n\n#ScrewedScore #ConsumerRights`
  }
  return `✅ Just ran my ${doc} through AI and it came back SAFE. No hidden fees, no red flags.\n\nGetScrewedScore — free bill & contract scanner:\n${url}\n\n#ScrewedScore`
}

export function DownloadCard({ result, analysisId }: DownloadCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied]           = useState(false)
  const [showCaption, setShowCaption] = useState(false)

  const caption = buildCaption(result, analysisId)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const url = buildCardUrl(result)
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `screwed-score-${result.screwed_score.toLowerCase()}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      setShowCaption(true)
    } catch {
      // silent fail — browser will still show network error if needed
    } finally {
      setDownloading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const scoreStyles = {
    SCREWED: { btn: 'bg-red-500 hover:bg-red-600 shadow-red-500/30',   label: 'text-red-400', border: 'border-red-500/20' },
    MAYBE:   { btn: 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/30', label: 'text-yellow-400', border: 'border-yellow-500/20' },
    SAFE:    { btn: 'bg-green-500 hover:bg-green-600 shadow-green-500/30',  label: 'text-green-400', border: 'border-green-500/20' },
  }
  const s = scoreStyles[result.screwed_score]

  return (
    <div className="space-y-3">
      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg ${s.btn} disabled:opacity-60`}
      >
        {downloading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating card…
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Save &amp; Share Card
          </>
        )}
      </button>

      {/* Caption panel — shown after download */}
      {showCaption && (
        <div className={`rounded-xl border ${s.border} bg-brand-surface overflow-hidden`}>
          <div className="px-4 py-2.5 border-b border-brand-border flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">
              Ready-to-post caption
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-sub hover:text-brand-text transition-colors"
            >
              {copied
                ? <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copied!</span></>
                : <><Copy className="w-3.5 h-3.5" />Copy</>}
            </button>
          </div>
          <pre className="p-4 text-xs text-brand-text/70 leading-relaxed whitespace-pre-wrap font-sans">
            {caption}
          </pre>
        </div>
      )}
    </div>
  )
}
