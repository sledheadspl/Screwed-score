'use client'

import { useState } from 'react'
import { MessageSquare, ThumbsUp, CheckCircle } from 'lucide-react'

const SCORE_LABELS = {
  SCREWED: { label: '🚨 SCREWED', color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' },
  MAYBE:   { label: '⚠️ MAYBE',   color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' },
  SAFE:    { label: '✅ SAFE',    color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/10' },
}

interface Props {
  defaultScore: 'SCREWED' | 'MAYBE' | 'SAFE'
  defaultCategory: string
  analysisId?: string | null
}

export function ShareExperience({ defaultScore, defaultCategory, analysisId }: Props) {
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    business_name: '',
    score: defaultScore,
    story: '',
    city: '',
    state: '',
    amount_dollars: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.business_name.trim()) return
    try {
      await fetch('/api/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          category: defaultCategory,
          amount_dollars: form.amount_dollars ? parseInt(form.amount_dollars) : null,
          analysis_id: analysisId ?? null,
        }),
      })
      setSubmitted(true)
      setOpen(false)
    } catch { /* non-fatal */ }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
        <CheckCircle className="w-4 h-4 shrink-0" />
        <span>Your experience has been shared with the community. Thank you!</span>
      </div>
    )
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-border bg-brand-muted hover:bg-brand-border transition-colors text-sm font-semibold text-brand-sub hover:text-brand-text">
          <MessageSquare className="w-4 h-4" />
          Share your experience with the community
        </button>
      ) : (
        <form onSubmit={handleSubmit}
          className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-sub" />
            <h3 className="font-bold text-brand-text text-sm">Share Your Experience</h3>
          </div>

          <div className="space-y-3">
            <input
              required
              placeholder="Business name (who did this to you?) *"
              value={form.business_name}
              onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
              className="w-full bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-sub/50 focus:outline-none focus:border-red-500/50"
            />

            <div className="flex gap-2">
              {(['SCREWED', 'MAYBE', 'SAFE'] as const).map(s => {
                const info = SCORE_LABELS[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, score: s }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                      form.score === s
                        ? `${info.bg} ${info.border} ${info.color}`
                        : 'bg-brand-muted border-brand-border text-brand-sub'
                    }`}>
                    {info.label}
                  </button>
                )
              })}
            </div>

            <textarea
              placeholder="What happened? Help others avoid the same trap... (optional)"
              rows={3}
              value={form.story}
              onChange={e => setForm(f => ({ ...f, story: e.target.value }))}
              className="w-full bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-sub/50 focus:outline-none focus:border-red-500/50 resize-none"
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                placeholder="City"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-sub/50 focus:outline-none focus:border-red-500/50"
              />
              <input
                placeholder="State"
                maxLength={2}
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className="bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-sub/50 focus:outline-none focus:border-red-500/50"
              />
              <input
                placeholder="$ amount"
                type="number"
                min="0"
                value={form.amount_dollars}
                onChange={e => setForm(f => ({ ...f, amount_dollars: e.target.value }))}
                className="bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-sub/50 focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl text-sm font-black text-white"
              style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
              Share with Community
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm text-brand-sub border border-brand-border hover:bg-brand-muted transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
