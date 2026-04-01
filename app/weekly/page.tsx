import { createServiceClient } from '@/lib/supabase'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'
import type { DocumentType } from '@/lib/types'
import { TrendingUp, Flame, ShieldCheck, BarChart2, ArrowRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export const revalidate = 3600 // rebuild at most once per hour

// ── Data fetching ──────────────────────────────────────────────────────────────

async function getWeeklyStats() {
  const supabase  = createServiceClient()
  const weekAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [analysesRes, experiencesRes, allTimeRes] = await Promise.all([
    // This week's analyses — only need score + type
    supabase
      .from('analyses')
      .select('screwed_score, document_type, screwed_score_percent')
      .gte('created_at', weekAgo.toISOString())
      .eq('is_public', true),

    // This week's community experiences
    supabase
      .from('experiences')
      .select('score, amount_dollars, business_name, category')
      .gte('created_at', weekAgo.toISOString()),

    // All-time totals
    supabase
      .from('analyses')
      .select('screwed_score', { count: 'exact', head: true })
      .eq('is_public', true),
  ])

  const analyses    = analysesRes.data    ?? []
  const experiences = experiencesRes.data ?? []
  const allTimeTotal = allTimeRes.count   ?? 0

  // ── Weekly analysis stats ──
  const total        = analyses.length
  const screwedCount = analyses.filter(a => a.screwed_score === 'SCREWED').length
  const maybeCount   = analyses.filter(a => a.screwed_score === 'MAYBE').length
  const safeCount    = analyses.filter(a => a.screwed_score === 'SAFE').length
  const screwedPct   = total > 0 ? Math.round((screwedCount / total) * 100) : 0

  // ── By document type ──
  const byType: Record<string, { total: number; screwed: number; maybe: number; safe: number }> = {}
  for (const a of analyses) {
    if (!byType[a.document_type]) byType[a.document_type] = { total: 0, screwed: 0, maybe: 0, safe: 0 }
    byType[a.document_type].total++
    if (a.screwed_score === 'SCREWED') byType[a.document_type].screwed++
    else if (a.screwed_score === 'MAYBE') byType[a.document_type].maybe++
    else byType[a.document_type].safe++
  }

  const industryBreakdown = Object.entries(byType)
    .map(([type, counts]) => ({
      type: type as DocumentType,
      label: DOCUMENT_TYPE_LABELS[type as DocumentType] ?? type,
      ...counts,
      screwedPct: Math.round((counts.screwed / counts.total) * 100),
    }))
    .filter(i => i.total >= 3)
    .sort((a, b) => b.screwedPct - a.screwedPct)

  // ── Dollar amounts from experiences ──
  const totalFlagged = experiences.reduce((sum, e) => sum + (e.amount_dollars ?? 0), 0)
  const expScrewed   = experiences.filter(e => e.score === 'SCREWED').length

  // ── Top reported businesses this week ──
  const bizCounts: Record<string, { name: string; count: number; screwed: number; dollars: number }> = {}
  for (const e of experiences) {
    const key = e.business_name.toLowerCase().trim()
    if (!bizCounts[key]) bizCounts[key] = { name: e.business_name, count: 0, screwed: 0, dollars: 0 }
    bizCounts[key].count++
    if (e.score === 'SCREWED') bizCounts[key].screwed++
    bizCounts[key].dollars += e.amount_dollars ?? 0
  }
  const topBusinesses = Object.values(bizCounts)
    .sort((a, b) => b.screwed - a.screwed || b.count - a.count)
    .slice(0, 5)

  // ── Week label ──
  const now      = new Date()
  const weekStart = new Date(weekAgo)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const weekLabel = `${fmt(weekStart)} – ${fmt(now)}, ${now.getFullYear()}`

  return {
    weekLabel,
    total,
    screwedCount,
    maybeCount,
    safeCount,
    screwedPct,
    totalFlagged,
    expScrewed,
    industryBreakdown,
    topBusinesses,
    allTimeTotal,
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function WeeklyPage() {
  const stats = await getWeeklyStats()

  const {
    weekLabel, total, screwedCount, screwedPct,
    totalFlagged, industryBreakdown, topBusinesses, allTimeTotal,
  } = stats

  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(255,59,48,0.07) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      </div>

      {/* Nav */}
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
          <Link href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
            Check Mine <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-red-400" />
            <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">Weekly Report</span>
          </div>
          <h1 className="text-4xl font-black text-brand-text leading-tight">
            State of <span style={{
              background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Screwing</span>
          </h1>
          <p className="text-brand-sub">{weekLabel} · Based on {total.toLocaleString()} documents analyzed this week</p>
        </div>

        {/* Hero stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Docs analyzed',  value: total.toLocaleString(),            color: 'text-brand-text', icon: BarChart2  },
            { label: 'Got SCREWED',    value: screwedCount.toLocaleString(),      color: 'text-red-400',   icon: AlertTriangle },
            { label: 'SCREWED rate',   value: `${screwedPct}%`,                  color: 'text-red-400',   icon: TrendingUp },
            { label: 'Dollars flagged',value: `$${totalFlagged.toLocaleString()}`, color: 'text-red-400',  icon: Flame      },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-brand-border bg-brand-surface p-4 space-y-2"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
              <Icon className={`w-4 h-4 ${color} opacity-70`} />
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-[11px] text-brand-sub">{label}</p>
            </div>
          ))}
        </div>

        {/* Industry breakdown */}
        {industryBreakdown.length > 0 && (
          <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
            <div className="px-5 py-3 border-b border-brand-border flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5 text-brand-sub" />
              <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">By Industry — Worst First</span>
            </div>
            <div className="divide-y divide-brand-border">
              {industryBreakdown.map((row, i) => (
                <div key={row.type} className="px-5 py-3.5 flex items-center gap-4">
                  <span className="text-xs font-black text-brand-sub/40 w-5 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-brand-text">{row.label}</span>
                      <span className={`text-sm font-black ${row.screwedPct >= 60 ? 'text-red-400' : row.screwedPct >= 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {row.screwedPct}% SCREWED
                      </span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                      <div className="bg-red-500/70    rounded-l-full" style={{ width: `${(row.screwed / row.total) * 100}%` }} />
                      <div className="bg-yellow-500/70"                style={{ width: `${(row.maybe  / row.total) * 100}%` }} />
                      <div className="bg-green-500/70  rounded-r-full" style={{ width: `${(row.safe   / row.total) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-brand-sub/50 shrink-0">{row.total} docs</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top reported businesses */}
        {topBusinesses.length > 0 && (
          <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
            <div className="px-5 py-3 border-b border-brand-border flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">Most Reported This Week</span>
            </div>
            <div className="divide-y divide-brand-border">
              {topBusinesses.map((biz, i) => (
                <div key={biz.name} className="px-5 py-3.5 flex items-center gap-3">
                  <span className="text-xs font-black text-brand-sub/40 w-5 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-brand-text truncate">{biz.name}</p>
                    <p className="text-xs text-brand-sub">
                      {biz.count} report{biz.count !== 1 ? 's' : ''} · {biz.screwed} SCREWED
                      {biz.dollars > 0 ? ` · $${biz.dollars.toLocaleString()} flagged` : ''}
                    </p>
                  </div>
                  <div className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                    biz.screwed / biz.count >= 0.6
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {Math.round((biz.screwed / biz.count) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All-time context */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 flex items-center gap-4"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
          <ShieldCheck className="w-8 h-8 text-green-400 shrink-0" />
          <div>
            <p className="font-bold text-brand-text">
              {allTimeTotal.toLocaleString()} documents analyzed all time
            </p>
            <p className="text-sm text-brand-sub mt-0.5">
              Every result is based on a real document submitted by a real person. No made-up data.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl overflow-hidden text-center p-8 space-y-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255,59,48,0.1) 0%, rgba(255,59,48,0.04) 100%)',
            border: '1px solid rgba(255,59,48,0.25)',
          }}>
          <p className="text-2xl font-black text-brand-text">Is your bill in next week's report?</p>
          <p className="text-sm text-brand-sub">Upload free. No account needed. Results in ~20 seconds.</p>
          <Link href="/"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-white text-base hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)', boxShadow: '0 0 40px rgba(255,59,48,0.35)' }}>
            Check My Documents — Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Footer note */}
        <p className="text-xs text-brand-sub/40 text-center">
          Data reflects documents submitted to GetScrewedScore in the past 7 days. Dollar amounts are AI estimates from submitted documents, not verified findings. Updated hourly.
        </p>

      </div>
    </div>
  )
}
