'use client'

import { useState } from 'react'
import { Share2, Check, Link2, Twitter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScrewedScore } from '@/lib/types'

interface ShareButtonProps {
  analysisId: string
  score: ScrewedScore
  variant?: 'icon' | 'full'
}

const SHARE_TEXT: Record<ScrewedScore, string> = {
  SCREWED: '🚨 Just got my Screwed Score — it came back SCREWED. Run your documents at getscrewedscore.com',
  MAYBE: '⚠️ My Screwed Score came back MAYBE — a few red flags worth reviewing. Check yours:',
  SAFE: '✅ Got a SAFE on my Screwed Score. No major red flags. Run your docs free:',
}

export function ShareButton({ analysisId, score, variant = 'icon' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

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
