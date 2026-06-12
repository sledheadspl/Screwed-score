'use client'

import { useState } from 'react'
import { Wrench, Loader2, Download, RotateCcw, AlertCircle, CheckCircle, X } from 'lucide-react'
import type { AnalysisResult } from '@/lib/types'

interface FixDocumentProps {
  result: AnalysisResult
}

export function FixDocument({ result }: FixDocumentProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const flagCount = result.top_findings.filter(f => f.severity === 'high' || f.severity === 'medium').length
  if (flagCount === 0 || result.screwed_score === 'SAFE') return null

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/fix-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fix failed')
      setHtml(data.html)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    if (!html && !loading) generate()
  }

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Fixed Document</title><style>
      body { margin: 0; padding: 0; font-family: Georgia, serif; }
      @media print { @page { margin: 0.75in; } }
    </style></head><body>${html}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  const scoreColor = result.screwed_score === 'SCREWED' ? 'text-red-400' : 'text-yellow-400'
  const borderColor = result.screwed_score === 'SCREWED' ? 'border-red-500/30' : 'border-yellow-500/30'
  const bgColor = result.screwed_score === 'SCREWED' ? 'bg-red-500/8' : 'bg-yellow-500/5'

  return (
    <>
      {/* Trigger card */}
      <div className={`rounded-2xl border ${borderColor} ${bgColor} p-5`}
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <Wrench className={`w-4 h-4 shrink-0 ${scoreColor}`} />
              <p className={`text-sm font-black ${scoreColor}`}>Fix This Document</p>
            </div>
            <p className="text-xs text-brand-sub leading-relaxed">
              AI rewrites the document with all {flagCount} flag{flagCount !== 1 ? 's' : ''} corrected — fair pricing, clean clauses, missing protections added.
            </p>
          </div>
          <button
            onClick={handleOpen}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-lg transition-all ${
              result.screwed_score === 'SCREWED'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-yellow-600 hover:bg-yellow-500'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Fix it
          </button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-brand-surface border border-brand-border rounded-2xl shadow-2xl my-8">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border/60">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-green-400" />
                <span className="font-black text-brand-text text-sm">Fixed Document</span>
                {html && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle className="w-3 h-3" /> Ready
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {html && (
                  <>
                    <button
                      onClick={generate}
                      disabled={loading}
                      className="flex items-center gap-1.5 text-xs text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors disabled:opacity-40"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-500 rounded-lg px-4 py-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Print / Save PDF
                    </button>
                  </>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-brand-sub hover:text-brand-text rounded-lg hover:bg-brand-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-brand-text">Rewriting your document…</p>
                    <p className="text-xs text-brand-sub">Fixing {flagCount} flag{flagCount !== 1 ? 's' : ''}, correcting pricing, adding missing protections</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  <button onClick={generate} className="ml-auto text-xs underline">Retry</button>
                </div>
              )}

              {html && !loading && (
                <>
                  <div className="rounded-xl border border-brand-border overflow-hidden mb-4">
                    <div className="bg-[#f5f5f0] min-h-[400px] p-8">
                      <div dangerouslySetInnerHTML={{ __html: html }} className="max-w-[720px] mx-auto" />
                    </div>
                  </div>
                  <p className="text-center text-xs text-brand-sub">
                    Click <strong className="text-brand-text">Print / Save PDF</strong> → choose &quot;Save as PDF&quot; in your print dialog.
                    This document has been corrected but is not legal advice — review with a qualified professional for high-stakes use.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
