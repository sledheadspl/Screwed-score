'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { Flame, ShieldCheck, AlertTriangle, Users, TrendingUp, Share2 } from 'lucide-react'
import Link from 'next/link'

interface BusinessScore {
  business_name: string
  category: string
  city?: string
  state?: string
  screwed_count: number
  maybe_count: number
  safe_count: number
  total_count: number
  screwed_percent: number
  total_flagged_dollars: number
}

interface Experience {
  id: string
  score: string
  story?: string
  city?: string
  state?: string
  amount_dollars?: number
  created_at: string
}

export default function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [business, setBusiness] = useState<BusinessScore | null>(null)
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/business-scores?slug=${slug}`).then(r => r.json()),
      fetch(`/api/experiences?business_slug=${slug}&limit=20`).then(r => r.json()),
    ]).then(([biz, exp]) => {
      if (biz.business) setBusiness(biz.business)
      if (Array.isArray(exp)) setExperiences(exp)
    }).finally(() => setLoading(false))
  }, [slug])

  const handleShare = () => {
    const url = window.location.href
    const text = business
      ? `🚨 ${business.business_name} has a ${business.screwed_percent}% SCREWED rating on GetScrewedScore — ${business.total_count} people reported getting overcharged. Check before you pay. screwedscore.com`
      : `Check this business on GetScrewedScore`
    if (navigator.share) {
      navigator.share({ title: 'GetScrewedScore', text, url })
    } else {
      navigator.clipboard.writeText(text + '\n' + url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const verdict = business
    ? business.screwed_percent >= 60 ? 'SCREWED'
    : business.screwed_percent >= 30 ? 'MIXED'
    : 'TRUSTED'
    : null

  const verdictStyle = {
    SCREWED: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: '🚨' },
    MIXED:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: '⚠️' },
    TRUSTED: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: '✅' },
  }

  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      </div>

      <nav className="sticky top-0 z-50 border-b border-brand-border/50 bg-brand-bg/85 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 select-none">
            <span className="text-base font-black text-brand-text">Get</span>
            <span className="text-base font-black" style={{
              background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Screwed</span>
            <span className="text-base font-black text-brand-text">Score</span>
          </Link>
          <Link href="/shame" className="text-xs text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors">
            ← Business Rankings
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : !business ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-brand-sub">Business not found.</p>
            <Link href="/shame" className="text-red-400 hover:underline text-sm">← Back to rankings</Link>
          </div>
        ) : (
          <>
            {/* Business header */}
            <div className={`rounded-2xl border ${verdictStyle[verdict!].border} ${verdictStyle[verdict!].bg} p-6 space-y-4`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-2xl">{verdictStyle[verdict!].icon}</span>
                    <h1 className="text-2xl font-black text-brand-text">{business.business_name}</h1>
                  </div>
                  {(business.city || business.state) && (
                    <p className="text-sm text-brand-sub">{[business.city, business.state].filter(Boolean).join(', ')} · {business.category.replace(/_/g, ' ')}</p>
                  )}
                </div>
                <button onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-muted transition-colors text-xs font-semibold text-brand-sub shrink-0">
                  <Share2 className="w-3.5 h-3.5" />
                  {copied ? 'Copied!' : 'Share'}
                </button>
              </div>

              {/* Big score */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className={`text-5xl font-black ${verdictStyle[verdict!].color}`}>{business.screwed_percent}%</div>
                  <div className="text-xs text-brand-sub mt-0.5">SCREWED rate</div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    <div className="bg-red-500" style={{ width: `${(business.screwed_count / business.total_count) * 100}%` }} />
                    <div className="bg-yellow-500" style={{ width: `${(business.maybe_count / business.total_count) * 100}%` }} />
                    <div className="bg-green-500" style={{ width: `${(business.safe_count / business.total_count) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-brand-sub">
                    <span className="text-red-400">{business.screwed_count} SCREWED</span>
                    <span className="text-yellow-400">{business.maybe_count} MAYBE</span>
                    <span className="text-green-400">{business.safe_count} SAFE</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-brand-sub">
                  <Users className="w-3.5 h-3.5" /> {business.total_count} community report{business.total_count !== 1 ? 's' : ''}
                </div>
                {business.total_flagged_dollars > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400">
                    <TrendingUp className="w-3.5 h-3.5" /> ${business.total_flagged_dollars.toLocaleString()} flagged in overcharges
                  </div>
                )}
              </div>
            </div>

            {/* Community reports */}
            {experiences.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-bold text-brand-text text-sm">Community Reports</h2>
                {experiences.map(e => {
                  const s = e.score === 'SCREWED' ? { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }
                    : e.score === 'MAYBE' ? { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' }
                    : { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' }
                  return (
                    <div key={e.id} className={`rounded-xl border ${s.border} ${s.bg} p-4 space-y-2`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${s.color}`}>{e.score}</span>
                        {e.amount_dollars && <span className="text-xs font-bold text-red-400">${e.amount_dollars.toLocaleString()} flagged</span>}
                        {(e.city || e.state) && <span className="text-xs text-brand-sub/60 ml-auto">{[e.city, e.state].filter(Boolean).join(', ')}</span>}
                      </div>
                      {e.story && <p className="text-sm text-brand-sub">&quot;{e.story}&quot;</p>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* CTA */}
            <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 text-center space-y-3">
              <p className="text-sm font-semibold text-brand-text">Had an experience with {business.business_name}?</p>
              <Link href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
                Upload your document and add your report
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
