'use client'

import { useState } from 'react'
import { Flame, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { BusinessScore } from '@/lib/business-scores'

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


export function ShameTabs({ shame, honor }: { shame: BusinessScore[]; honor: BusinessScore[] }) {
  const [tab, setTab] = useState<'shame' | 'honor'>('shame')
  const businesses = tab === 'shame' ? shame : honor

  return (
    <>
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
        {businesses.length === 0 ? (
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

    </>
  )
}
