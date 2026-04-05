'use client'

import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'

interface Stats {
  total_recovered: number
  total_reports:   number
  total_wins:      number
}

export function VictoryBanner() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/outcomes')
      .then(r => r.ok ? r.json() : null)
      .then((data: Stats | null) => { if (data) setStats(data) })
      .catch(() => {})
  }, [])

  // Don't render until there's something real to show
  if (!stats || (stats.total_recovered === 0 && stats.total_reports === 0)) return null

  return (
    <div className="rounded-2xl border border-green-500/20 bg-green-500/5 px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
        <Trophy className="w-5 h-5 text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        {stats.total_recovered > 0 ? (
          <p className="text-sm font-black text-brand-text">
            <span className="text-green-400">${stats.total_recovered.toLocaleString()}</span> recovered by our community
          </p>
        ) : (
          <p className="text-sm font-black text-brand-text">
            <span className="text-green-400">{stats.total_reports}</span>{' '}
            {stats.total_reports === 1 ? 'person has' : 'people have'} fought back
          </p>
        )}
        <p className="text-xs text-brand-sub">
          {stats.total_reports} outcome{stats.total_reports !== 1 ? 's' : ''} reported
          {stats.total_wins > 0 && ` · ${stats.total_wins} won`}
          {' · '}Real disputes, real results
        </p>
      </div>
    </div>
  )
}
