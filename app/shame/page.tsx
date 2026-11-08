import { Flame, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'
import { getShameData } from '@/lib/business-scores'
import { ShameTabs } from '@/components/shame/ShameTabs'

// Server-rendered so the rankings are in the HTML search engines index.
// Rebuilt at most every 10 minutes.
export const revalidate = 600

export default async function ShamePage() {
  const { shame, honor, stats } = await getShameData()

  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(255,59,48,0.08) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      </div>

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

        <ShameTabs shame={shame} honor={honor} />

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
