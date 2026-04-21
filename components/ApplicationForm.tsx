'use client'

import { useState } from 'react'

interface Props {
  jobId:           string
  minReputation:   number
  workerScore?:    number
  isAuthenticated: boolean
  hasApplied:      boolean
}

export function ApplicationForm({ jobId, minReputation, workerScore, isAuthenticated, hasApplied }: Props) {
  const [note,        setNote]        = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(hasApplied)
  const [error,       setError]       = useState<string | null>(null)

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-brand-sub text-sm mb-4">Sign in to apply for this gig</p>
        <a
          href="/auth"
          className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'rgba(0,229,255,0.12)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.25)' }}
        >
          Sign In / Sign Up →
        </a>
      </div>
    )
  }

  if (minReputation > 0 && workerScore !== undefined && workerScore < minReputation) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-sm font-bold mb-1" style={{ color: '#f59e0b' }}>Reputation Required</p>
        <p className="text-brand-sub text-sm">
          This gig requires a reputation score of {minReputation}+. Your current score is {workerScore}.
          Complete more jobs to unlock.
        </p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}
      >
        <p className="text-sm font-bold" style={{ color: '#4ade80' }}>Application Submitted ✓</p>
        <p className="text-brand-sub text-xs mt-1">The operator will review and reach out if you're selected.</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cover_note: note.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit application')
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-brand-sub mb-1.5">
          Cover Note <span className="opacity-50">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Briefly describe why you're a good fit…"
          className="w-full rounded-xl px-4 py-3 text-sm text-brand-text placeholder:text-brand-sub/40 resize-none outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border:     '1px solid rgba(255,255,255,0.1)',
          }}
        />
        <p className="text-right text-[10px] text-brand-sub/40 mt-1">{note.length}/500</p>
      </div>

      {error && (
        <p className="text-xs font-semibold" style={{ color: '#ff6b60' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.18), rgba(0,229,255,0.08))',
          border:     '1px solid rgba(0,229,255,0.3)',
          color:      '#00e5ff',
        }}
      >
        {submitting ? 'Submitting…' : 'Apply Now →'}
      </button>
    </form>
  )
}
