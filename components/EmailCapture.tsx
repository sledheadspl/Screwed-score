'use client'

import { useState } from 'react'
import { Check, Loader2, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailCaptureProps {
  analysisId: string
  source?: string
}

export function EmailCapture({ analysisId, source = 'result_page' }: EmailCaptureProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, analysis_id: analysisId }),
      })
      if (!res.ok) throw new Error()
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-green-500/25 bg-green-950/15 p-5 flex items-center gap-4 animate-scale-in">
        <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
          <Check className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-green-400">You&apos;re on the list</p>
          <p className="text-xs text-brand-sub mt-0.5">We&apos;ll notify you when content generation and auto-posting drops</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>

      {/* Top accent bar */}
      <div className="h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-brand-text">Coming soon: Auto-generate & post your results</p>
            <p className="text-xs text-brand-sub mt-0.5 leading-relaxed">
              TikTok-ready scripts, viral captions, and auto-posting to your social accounts. Be first.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className={cn(
              'flex-1 px-3.5 py-2.5 text-sm rounded-xl bg-brand-bg border border-brand-border',
              'text-brand-text placeholder:text-brand-sub/40',
              'focus:outline-none focus:border-red-500/50 transition-colors'
            )}
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email.includes('@')}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 active:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shrink-0"
          >
            {status === 'loading' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {status === 'error' ? 'Try again' : 'Notify me'}
          </button>
        </form>
      </div>
    </div>
  )
}
