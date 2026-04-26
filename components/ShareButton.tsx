'use client'

import { useState } from 'react'
import { Share2, Check, Link2, Twitter, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScrewedScore, AnalysisResult } from '@/lib/types'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'

interface ShareButtonProps {
  analysisId: string
  score: ScrewedScore
  variant?: 'icon' | 'full'
  // When provided, enables the "Save as image" button — generates a TikTok/IG-Story
  // sized 1080x1920 share card from the analysis data and triggers a phone download.
  result?: AnalysisResult
}

const SHARE_TEXT: Record<ScrewedScore, string> = {
  SCREWED: '🚨 Just got my Screwed Score — it came back SCREWED. Run your documents at getscrewedscore.com',
  MAYBE: '⚠️ My Screwed Score came back MAYBE — a few red flags worth reviewing. Check yours:',
  SAFE: '✅ Got a SAFE on my Screwed Score. No major red flags. Run your docs free:',
}

function buildShareCardUrl(result: AnalysisResult, fmt: 'story' | 'post' = 'story'): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.screwedscore.com'
  const docType = DOCUMENT_TYPE_LABELS[result.document_type] ?? result.document_type
  const amount = Math.round(result.overcharge?.total_flagged_amount ?? 0)
  const findings = result.top_findings ?? []
  const params = new URLSearchParams({
    fmt,
    score: result.screwed_score,
    percent: String(result.screwed_score_percent ?? 0),
    type: docType,
    amount: String(amount),
    f1: findings[0]?.title ?? '',
    f2: findings[1]?.title ?? '',
  })
  return `${origin}/share-card?${params.toString()}`
}

export function ShareButton({ analysisId, score, variant = 'icon', result }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://getscrewedscore.com'}/r/${analysisId}`
  const shareText = SHARE_TEXT[score]
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
  }

  async function handleDownloadImage() {
    if (!result || downloading) return
    setDownloading(true)
    try {
      const url = buildShareCardUrl(result, 'story')
      const res = await fetch(url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `screwed-score-${analysisId.slice(0, 8)}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (err) {
      console.error('[share] download failed:', err)
      // Fallback: open in new tab so user can long-press → save
      window.open(buildShareCardUrl(result, 'story'), '_blank')
    } finally {
      setDownloading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-muted hover:bg-brand-muted/80 hover:border-brand-muted text-xs text-brand-sub hover:text-brand-text transition-all"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl border border-brand-border bg-brand-surface2 overflow-hidden shadow-2xl"
              style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
              <button
                onClick={() => { handleCopy(); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-brand-muted transition-colors text-left"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4 text-brand-sub" />}
                <span className="text-brand-text">{copied ? 'Copied!' : 'Copy link'}</span>
              </button>
              <div className="h-px bg-brand-border" />
              <a
                href={tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-brand-muted transition-colors"
              >
                <Twitter className="w-4 h-4 text-sky-400" />
                <span className="text-brand-text">Post on X</span>
              </a>
              {result && (
                <>
                  <div className="h-px bg-brand-border" />
                  <button
                    onClick={() => { handleDownloadImage(); setOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-brand-muted transition-colors text-left"
                  >
                    <ImageIcon className="w-4 h-4 text-pink-400" />
                    <span className="text-brand-text">Save as image (Story)</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={handleCopy}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border',
          copied
            ? 'bg-green-500/15 text-green-400 border-green-500/30'
            : 'bg-brand-muted text-brand-sub hover:text-brand-text border-brand-border hover:border-brand-muted'
        )}
      >
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>

      {result && (
        <button
          onClick={handleDownloadImage}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white border transition-all disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
            borderColor: 'rgba(236,72,153,0.4)',
            boxShadow: '0 0 20px rgba(236,72,153,0.25)',
          }}
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          {downloading ? 'Generating…' : 'Save image (TikTok/Story)'}
        </button>
      )}

      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-sky-500/10 text-sky-400 border border-sky-500/25 hover:bg-sky-500/20 transition-all"
      >
        <Twitter className="w-4 h-4" />
        Post on X
      </a>
    </div>
  )
}
