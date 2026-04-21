'use client'

import { useState } from 'react'
import { Users, Clock, CheckCircle, ArrowRight } from 'lucide-react'

interface Props {
  analysisId:   string
  documentType: string
  scorePercent: number
  userEmail?:   string | null
}

export function HumanAuditCard({ analysisId, documentType, scorePercent, userEmail }: Props) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/audit/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          analysis_id:   analysisId,
          document_type: documentType,
          score_percent: String(scorePercent),
          email:         userEmail ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border:     '1px solid rgba(255,255,255,0.08)',
        boxShadow:  '0 2px 16px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.2)' }}
        >
          <Users className="w-5 h-5" style={{ color: '#00e5ff' }} />
        </div>
        <div>
          <h3 className="font-black text-brand-text">Get a Human to Review This</h3>
          <p className="text-xs text-brand-sub mt-0.5">A real auditor goes through your bill line by line</p>
        </div>
      </div>

      {/* Value props */}
      <div className="space-y-2.5">
        {[
          { icon: CheckCircle, text: 'Flags every overcharge and error the AI found — and digs deeper' },
          { icon: Clock,       text: 'Plain-English report delivered to your email within 48 hours' },
          { icon: CheckCircle, text: 'Includes exact language to dispute each charge' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-2.5">
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#00e5ff' }} />
            <p className="text-sm text-brand-sub">{text}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="space-y-2">
        <button
          onClick={handleClick}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,229,255,0.08))',
            border:     '1px solid rgba(0,229,255,0.35)',
            color:      '#00e5ff',
          }}
        >
          {loading ? 'Redirecting…' : (
            <>
              Get Human Audit — $9.99
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {error && <p className="text-xs text-center font-semibold" style={{ color: '#ff6b60' }}>{error}</p>}

        <p className="text-center text-[11px] text-brand-sub/50">
          One-time payment · 48hr delivery · 100% satisfaction or refund
        </p>
      </div>
    </div>
  )
}
