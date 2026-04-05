'use client'

import { useEffect, useState } from 'react'

interface TickerItem {
  score:   'SCREWED' | 'MAYBE' | 'SAFE'
  doc:     string
  amount:  string
  minsAgo: number
}

const FALLBACK: TickerItem[] = [
  { score: 'SCREWED', doc: 'Mechanic Invoice',     amount: '$847',   minsAgo: 4  },
  { score: 'SAFE',    doc: 'Employment Contract',  amount: '',       minsAgo: 7  },
  { score: 'SCREWED', doc: 'Medical Bill',         amount: '$1,240', minsAgo: 12 },
  { score: 'MAYBE',   doc: 'Phone Bill',           amount: '$43',    minsAgo: 18 },
  { score: 'SCREWED', doc: 'Contractor Estimate',  amount: '$2,100', minsAgo: 23 },
  { score: 'MAYBE',   doc: 'Lease Agreement',      amount: '$310',   minsAgo: 31 },
  { score: 'SCREWED', doc: 'Dental Bill',          amount: '$590',   minsAgo: 45 },
  { score: 'SAFE',    doc: 'Insurance Quote',      amount: '',       minsAgo: 52 },
  { score: 'SCREWED', doc: 'Internet / Cable',     amount: '$34/mo', minsAgo: 67 },
  { score: 'MAYBE',   doc: 'Brand Deal Contract',  amount: '',       minsAgo: 88 },
]

const EMOJI:  Record<string, string> = { SCREWED: '🚨', MAYBE: '⚠️', SAFE: '✅' }
const BADGE:  Record<string, string> = {
  SCREWED: 'bg-red-500/10 border-red-500/20 text-red-400',
  MAYBE:   'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  SAFE:    'bg-green-500/10 border-green-500/20 text-green-400',
}

function timeLabel(mins: number) {
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24)    return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK)

  useEffect(() => {
    fetch('/api/recent-scans')
      .then(r => r.ok ? r.json() : null)
      .then((data: TickerItem[] | null) => {
        if (Array.isArray(data) && data.length >= 5) setItems(data)
      })
      .catch(() => {})
  }, [])

  const display = [...items, ...items]

  return (
    <div className="animate-fade-in delay-500 border-y border-brand-border/60 overflow-hidden py-3 my-6"
      style={{ background: 'linear-gradient(90deg, rgba(8,8,8,0.98) 0%, transparent 5%, transparent 95%, rgba(8,8,8,0.98) 100%)' }}>
      <div className="ticker-track gap-8 pl-8">
        {display.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-3 pr-12">
            <span className={`text-[11px] font-black px-2 py-0.5 rounded border ${BADGE[item.score]}`}>
              {EMOJI[item.score]} {item.score}
            </span>
            <span className="text-xs text-brand-text font-semibold">{item.doc}</span>
            {item.amount && (
              <span className="text-xs font-bold text-red-400">{item.amount}</span>
            )}
            <span className="text-[10px] text-brand-sub/40">{timeLabel(item.minsAgo)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
