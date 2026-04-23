'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, ThumbsUp, Filter, ShieldCheck, AlertTriangle, CheckCircle, Plus, BadgeCheck } from 'lucide-react'
import Link from 'next/link'

interface VerifiedBusiness {
  id: string
  name: string
  category: string
  city: string | null
  state: string | null
  tagline: string | null
  logo_url: string | null
  verified: boolean
}

interface Experience {
  id: string
  business_name: string
  category: string
  score: 'SCREWED' | 'MAYBE' | 'SAFE'
  story?: string
  city?: string
  state?: string
  amount_dollars?: number
  upvotes: number
  created_at: string
}

const SCORE_STYLE = {
  SCREWED: { icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    label: 'SCREWED' },
  MAYBE:   { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'MAYBE'   },
  SAFE:    { icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  label: 'SAFE'    },
}

const CATEGORIES = [
  { value: 'all',                  label: 'All Categories' },
  { value: 'mechanic_invoice',     label: 'Mechanic' },
  { value: 'medical_bill',         label: 'Medical' },
  { value: 'dental_bill',          label: 'Dental' },
  { value: 'contractor_estimate',  label: 'Contractor' },
  { value: 'phone_bill',           label: 'Phone / Wireless' },
  { value: 'internet_bill',        label: 'Internet / Cable' },
  { value: 'lease_agreement',      label: 'Landlord' },
  { value: 'insurance_quote',      label: 'Insurance' },
  { value: 'employment_contract',  label: 'Employer' },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}

export default function CommunityPage() {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [category, setCategory]       = useState('all')
  const [scoreFilter, setScoreFilter] = useState('all')
  const [loading, setLoading]         = useState(true)
  const [upvoted, setUpvoted]         = useState<Set<string>>(new Set())
  const [verifiedBizs, setVerifiedBizs] = useState<VerifiedBusiness[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '30' })
      if (category !== 'all') params.set('category', category)
      if (scoreFilter !== 'all') params.set('score', scoreFilter)
      const res = await fetch(`/api/experiences?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setExperiences(data)
    } finally {
      setLoading(false)
    }
  }, [category, scoreFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/vendors/search?claimed=true&limit=8')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setVerifiedBizs(data) })
      .catch(() => {})
  }, [])

  const handleUpvote = async (id: string) => {
    if (upvoted.has(id)) return
    setUpvoted(prev => new Set([...prev, id]))
    setExperiences(prev => prev.map(e => e.id === id ? { ...e, upvotes: e.upvotes + 1 } : e))
    await fetch(`/api/experiences?id=${id}`, { method: 'PATCH' }).catch(() => {})
  }

  const screwedCount = experiences.filter(e => e.score === 'SCREWED').length
  const safeCount    = experiences.filter(e => e.score === 'SAFE').length

  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(255,59,48,0.08) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-red-400" />
            <h1 className="text-3xl font-black text-brand-text">Community Wall of Shame</h1>
          </div>
          <p className="text-brand-sub">
            Real people. Real businesses. Real experiences. The community that keeps each other safe.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-red-400 font-bold">{screwedCount} got screwed</span>
            <span className="text-brand-sub">·</span>
            <span className="text-green-400 font-bold">{safeCount} found honorable businesses</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 text-xs text-brand-sub mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </div>
          {['all', 'SCREWED', 'MAYBE', 'SAFE'].map(s => (
            <button key={s}
              onClick={() => setScoreFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                scoreFilter === s
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-brand-muted border-brand-border text-brand-sub hover:text-brand-text'
              }`}>
              {s === 'all' ? 'All Results' : s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                category === c.value
                  ? 'bg-brand-surface border-brand-border text-brand-text'
                  : 'bg-brand-muted border-brand-border/50 text-brand-sub hover:text-brand-text'
              }`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Users className="w-12 h-12 text-brand-sub/30 mx-auto" />
            <p className="text-brand-sub">No experiences yet in this category.</p>
            <p className="text-xs text-brand-sub/60">Scan a document and share your story first.</p>
            <Link href="/"
              className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-xl border border-brand-border text-sm font-semibold text-brand-sub hover:text-brand-text hover:bg-brand-muted transition-colors">
              <Plus className="w-4 h-4" /> Scan a Document
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {experiences.map(e => {
              const style = SCORE_STYLE[e.score]
              const Icon  = style.icon
              return (
                <div key={e.id}
                  className={`rounded-2xl border ${style.border} ${style.bg} p-5 space-y-3`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-black ${style.color} border ${style.border} rounded-full px-2.5 py-0.5 flex items-center gap-1`}>
                          <Icon className="w-3 h-3" /> {style.label}
                        </span>
                        <span className="font-bold text-brand-text">{e.business_name}</span>
                        {e.amount_dollars && (
                          <span className="text-red-400 font-bold text-sm">${e.amount_dollars.toLocaleString()}</span>
                        )}
                      </div>
                      {(e.city || e.state) && (
                        <p className="text-xs text-brand-sub">{[e.city, e.state].filter(Boolean).join(', ')}</p>
                      )}
                    </div>
                    <span className="text-xs text-brand-sub/60 shrink-0">{timeAgo(e.created_at)}</span>
                  </div>

                  {e.story && (
                    <p className="text-sm text-brand-sub leading-relaxed">&quot;{e.story}&quot;</p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-brand-sub/60 capitalize">
                      {e.category.replace(/_/g, ' ')}
                    </span>
                    <button
                      onClick={() => handleUpvote(e.id)}
                      disabled={upvoted.has(e.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                        upvoted.has(e.id) ? 'text-red-400' : 'text-brand-sub hover:text-red-400'
                      }`}>
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {e.upvotes > 0 && e.upvotes} This happened to me too
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Verified Businesses */}
        {verifiedBizs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5" style={{ color: '#4ade80' }} />
                <h2 className="font-black text-brand-text">Verified Honest Businesses</h2>
              </div>
              <Link href="/for-businesses" className="text-xs text-brand-sub hover:text-brand-text transition-colors underline underline-offset-2">
                Add your business →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {verifiedBizs.map(v => (
                <div key={v.id} className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)' }}>
                  {v.logo_url ? (
                    <img src={v.logo_url} alt={v.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
                      {v.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-brand-text truncate">{v.name}</span>
                      {v.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#4ade80' }} />}
                    </div>
                    <p className="text-xs text-brand-sub capitalize truncate">
                      {v.category}{v.city || v.state ? ` · ${[v.city, v.state].filter(Boolean).join(', ')}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* For Businesses CTA */}
        <div className="rounded-2xl border p-6 text-center space-y-3"
          style={{ background: 'rgba(74,222,128,0.03)', borderColor: 'rgba(74,222,128,0.15)' }}>
          <ShieldCheck className="w-10 h-10 mx-auto" style={{ color: '#4ade80' }} />
          <h3 className="font-bold text-brand-text">Are you an honest business?</h3>
          <p className="text-sm text-brand-sub">
            Claim your profile, add your bio, and earn the Verified Honest Business badge.
            Free — takes about 5 minutes.
          </p>
          <Link href="/for-businesses"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #4ade80, #16a34a)', color: '#000' }}>
            <ShieldCheck className="w-4 h-4" /> Get Verified — Free
          </Link>
        </div>

      </div>
    </div>
  )
}
