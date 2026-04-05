'use client'

import { useState, useEffect } from 'react'
import { Flame, ShieldCheck, AlertTriangle, TrendingUp, Users, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface BusinessScore {
  id: string
  business_name: string
  business_slug: string
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

const TABS = [
  { id: 'shame',  label: '🚨 Wall of Shame',   desc: 'Businesses the community got screwed by' },
  { id: 'honor',  label: '✅ Hall of Honor',    desc: 'Businesses the community actually trusts' },
]

function ScoreBar({ screwed, maybe, safe, total }: { screwed: number; maybe: number; safe: number; total: number }) {
  if (total === 0) return null
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-px w-full">
      <div className="bg-red-500 rounded-l-full" style={{ width: `${(screwed / total) * 100}%` }} />
      <div className="bg-yellow-500" style={{ width: `${(maybe / total) * 100}%` }} />
      <div className="bg-green-500 rounded-r-full" style={{ width: `${(safe / total) * 100}%` }} />
    </div>
  )
}

export default function ShamePage() {
  const [tab, setTab]           = useState<'shame' | 'honor'>('shame')
  const [businesses, setBusinesses] = useState<BusinessScore[]>([])
  const [loading, setLoading]   = useState(true)
  const [stats, setStats]       = useState({ total_reports: 0, total_flagged: 0, businesses: 0 })

  useEffect(() => {
    setLoading(true)
    fetch(`/api/business-scores?tab=${tab}&limit=20`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.businesses)) setBusinesses(data.businesses)
        if (data.stats) setStats(data.stats)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab])

  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(255,59,48,0.08) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      </div>

      <nav className="sticky top-0 z-50 border-b border-brand-border/50 bg-brand-bg/85 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 select-none">
            <span className="text-base font-black text-brand-text">Get</span>
            <span className="text-base font-black" style={{
              background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Screwed</span>
            <span className="text-base font-black text-brand-text">Score</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/community" className="text-xs text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors">Community</Link>
            <Link href="/" className="text-xs text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors">← Scan a Doc</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-7 h-7 text-red-400" />
            <h1 className="text-3xl font-black text-brand-text">Business Screwed Score</h1>
          </div>
          <p className="text-brand-sub max-w-xl">
            Every time someone uploads a document from a business, that business gets rated.
            No hiding. No paying for better ratings. Every rating reflects AI analysis of a real submitted document.
          </p>

          {/* Community stats */}
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-surface border border-brand-border">
              <Users className="w-4 h-4 text-brand-sub" />
              <span className="text-sm font-bold text-brand-text">{stats.total_reports.toLocaleString()}</span>
              <span className="text-xs text-brand-sub">community reports</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-surface border border-brand-border">
              <TrendingUp className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-red-400">${stats.total_flagged.toLocaleString()}</span>
              <span className="text-xs text-brand-sub">flagged (AI est.)</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-surface border border-brand-border">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-brand-text">{stats.businesses.toLocaleString()}</span>
              <span className="text-xs text-brand-sub">businesses rated</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id as 'shame' | 'honor')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                tab === t.id
                  ? t.id === 'shame'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-brand-muted border-brand-border text-brand-sub hover:text-brand-text'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-brand-sub -mt-4">
          {tab === 'shame' ? 'Businesses with the highest percentage of SCREWED ratings from the community.' : 'Businesses with the highest percentage of SAFE ratings from the community.'}
        </p>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Flame className="w-12 h-12 text-brand-sub/20 mx-auto" />
            <p className="text-brand-sub">No businesses rated yet.</p>
            <p className="text-xs text-brand-sub/60">Scan a document and submit the business to get started.</p>
            <Link href="/"
              className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-xl border border-brand-border text-sm font-semibold text-brand-sub hover:text-brand-text hover:bg-brand-muted transition-colors">
              Scan a Document →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses.map((b, i) => (
              <Link key={b.id} href={`/business/${b.business_slug}`}
                className="flex items-center gap-4 p-4 rounded-2xl border border-brand-border bg-brand-surface hover:bg-brand-muted transition-colors group">

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                  tab === 'shame' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                }`}>
                  #{i + 1}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-brand-text truncate">{b.business_name}</span>
                    {(b.city || b.state) && (
                      <span className="text-xs text-brand-sub/60">{[b.city, b.state].filter(Boolean).join(', ')}</span>
                    )}
                  </div>
                  <ScoreBar screwed={b.screwed_count} maybe={b.maybe_count} safe={b.safe_count} total={b.total_count} />
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-red-400 font-semibold">{b.screwed_percent}% SCREWED</span>
                    <span className="text-brand-sub/40">·</span>
                    <span className="text-brand-sub">{b.total_count} report{b.total_count !== 1 ? 's' : ''}</span>
                    {b.total_flagged_dollars > 0 && (
                      <>
                        <span className="text-brand-sub/40">·</span>
                        <span className="text-red-400">${b.total_flagged_dollars.toLocaleString()} flagged (est.)</span>
                      </>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-brand-sub/30 group-hover:text-brand-sub transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 text-center space-y-3">
          <p className="font-bold text-brand-text">Is your business on this list?</p>
          <p className="text-sm text-brand-sub">Every rating reflects AI analysis of documents submitted by real customers. Dollar amounts are AI estimates from those documents, not verified overcharge findings.</p>
          <Link href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
            Scan Your Own Documents →
          </Link>
        </div>

      </div>
    </div>
  )
}
