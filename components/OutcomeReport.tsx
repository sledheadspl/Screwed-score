'use client'

import { useState, useEffect } from 'react'

interface Props {
  analysisId: string
  score: 'SCREWED' | 'MAYBE' | 'SAFE'
}

type OutcomeType = 'won' | 'partial' | 'lost' | 'pending'

const OPTIONS: {
  value:  OutcomeType
  icon:   string
  label:  string
  sub:    string
  active: string
}[] = [
  {
    value:  'won',
    icon:   '🏆',
    label:  'Full win',
    sub:    'Got full refund / they fixed it',
    active: 'border-green-500/40 bg-green-500/8 text-green-400',
  },
  {
    value:  'partial',
    icon:   '✅',
    label:  'Partial win',
    sub:    'Got some of it back',
    active: 'border-yellow-500/40 bg-yellow-500/8 text-yellow-400',
  },
  {
    value:  'lost',
    icon:   '❌',
    label:  'They refused',
    sub:    'No adjustment given',
    active: 'border-red-500/30 bg-red-500/6 text-red-400',
  },
  {
    value:  'pending',
    icon:   '⏳',
    label:  'Still fighting',
    sub:    'Dispute in progress',
    active: 'border-brand-border bg-brand-muted text-brand-sub',
  },
]

export function OutcomeReport({ analysisId, score }: Props) {
  const [selected, setSelected]             = useState<OutcomeType | null>(null)
  const [amount, setAmount]                 = useState('')
  const [submitted, setSubmitted]           = useState(false)
  const [loading, setLoading]               = useState(false)
  const [alreadyReported, setAlreadyReported] = useState(false)

  useEffect(() => {
    if (score === 'SAFE') return
    if (localStorage.getItem(`outcome_${analysisId}`)) setAlreadyReported(true)
  }, [analysisId, score])

  if (score === 'SAFE') return null

  const handleSubmit = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await fetch('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysisId,
          outcome:     selected,
          recovered:   amount ? parseInt(amount, 10) : 0,
        }),
      })
      localStorage.setItem(`outcome_${analysisId}`, selected)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (alreadyReported || submitted) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5 text-center space-y-1">
        <p className="text-sm font-bold text-green-400">Thanks for reporting your outcome!</p>
        <p className="text-xs text-brand-sub">Every report helps the community know what works.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
      <div className="space-y-1">
        <p className="text-sm font-bold text-brand-text">Did you dispute it?</p>
        <p className="text-xs text-brand-sub">
          Report what happened — your outcome adds to the community recovery total.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selected === opt.value
                ? opt.active
                : 'border-brand-border bg-brand-muted text-brand-sub hover:text-brand-text'
            }`}
          >
            <div className="text-lg mb-1">{opt.icon}</div>
            <p className="text-xs font-bold leading-tight">{opt.label}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{opt.sub}</p>
          </button>
        ))}
      </div>

      {(selected === 'won' || selected === 'partial') && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-sub shrink-0">Amount recovered:</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-brand-sub pointer-events-none">$</span>
            <input
              type="number"
              min="0"
              max="100000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-6 pr-3 py-2 rounded-lg border border-brand-border bg-brand-muted text-sm text-brand-text placeholder:text-brand-sub/40 focus:outline-none focus:border-green-500/50"
            />
          </div>
        </div>
      )}

      {selected && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
        >
          {loading ? 'Saving…' : 'Submit Outcome'}
        </button>
      )}
    </div>
  )
}
