'use client'

import { useState } from 'react'
import { FileText, Copy, Download, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  analysisId: string
  score: 'SCREWED' | 'MAYBE' | 'SAFE'
}

export function DisputeLetter({ analysisId, score }: Props) {
  const [letter, setLetter]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  if (score === 'SAFE') return null

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/dispute-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: analysisId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setLetter(data.letter)
    } catch {
      setError('Could not generate letter. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    if (!letter) return
    navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    if (!letter) return
    const blob = new Blob([letter], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'dispute-letter.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden">
      {!letter ? (
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-brand-text">Generate a Dispute Letter</p>
              <p className="text-sm text-brand-sub mt-0.5">
                Get a ready-to-send professional letter with the exact issues and dollar amounts from this analysis. Free.
              </p>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={generate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing your letter...</>
              : <><FileText className="w-4 h-4" /> Generate Dispute Letter — Free</>
            }
          </button>
        </div>
      ) : (
        <div className="divide-y divide-brand-border">
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">Dispute Letter</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-border bg-brand-muted hover:bg-brand-surface transition-colors text-brand-sub">
                {copied
                  ? <><CheckCircle className="w-3 h-3 text-green-400" /> Copied</>
                  : <><Copy className="w-3 h-3" /> Copy</>
                }
              </button>
              <button onClick={download}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-border bg-brand-muted hover:bg-brand-surface transition-colors text-brand-sub">
                <Download className="w-3 h-3" /> Download
              </button>
            </div>
          </div>

          <div className="p-5">
            <pre className="text-sm text-brand-sub whitespace-pre-wrap font-sans leading-relaxed">{letter}</pre>
          </div>

          <div className="px-5 py-3 bg-blue-500/5 border-t border-blue-500/10">
            <p className="text-xs text-blue-400/70">
              Fill in [YOUR NAME], [DATE], and your contact details before sending. Keep a copy for your records.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
