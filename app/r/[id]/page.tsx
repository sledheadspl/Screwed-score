import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { ScoreCard } from '@/components/ScoreCard'
import { FindingsList } from '@/components/FindingsList'
import { EmailCapture } from '@/components/EmailCapture'
import type { AnalysisResult } from '@/lib/types'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'
import { getScoreEmoji } from '@/lib/utils'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

interface Props {
  params: { id: string }
}

async function getAnalysis(id: string): Promise<AnalysisResult | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error || !data) return null
  supabase.rpc('increment_share_views', { analysis_id: id }).then(() => {})

  return {
    id: data.id,
    document_type: data.document_type,
    screwed_score: data.screwed_score,
    screwed_score_percent: data.screwed_score_percent,
    screwed_score_reason: data.screwed_score_reason,
    top_findings: data.top_findings ?? [],
    overcharge: data.overcharge_output ?? {},
    contract_guard: data.contract_guard_output ?? {},
    plain_summary: data.plain_summary ?? '',
    what_they_tried: data.what_they_tried ?? [],
    what_to_do_next: data.what_to_do_next ?? [],
    created_at: data.created_at,
    is_public: data.is_public,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const analysis = await getAnalysis(params.id)
  if (!analysis) return { title: 'Analysis not found — GetScrewedScore' }

  const emoji = getScoreEmoji(analysis.screwed_score)
  const docLabel = DOCUMENT_TYPE_LABELS[analysis.document_type]
  const title = `${emoji} ${analysis.screwed_score} — ${docLabel} Analysis`
  const description = analysis.screwed_score_reason.slice(0, 150)

  const ogUrl = `/og?score=${analysis.screwed_score}&percent=${analysis.screwed_score_percent}&type=${encodeURIComponent(docLabel)}`

  return {
    title: `${title} | GetScrewedScore`,
    description,
    openGraph: {
      title, description,
      url: `https://getscrewedscore.com/r/${params.id}`,
      type: 'website',
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image', title, description,
      images: [ogUrl],
    },
    robots: { index: false, follow: false },
  }
}

export default async function SharePage({ params }: Props) {
  const analysis = await getAnalysis(params.id)
  if (!analysis) notFound()

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse, rgba(255,59,48,0.2) 0%, transparent 70%)' }} />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-brand-border/60 bg-brand-bg/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 select-none">
            <span className="text-base font-black text-brand-text tracking-tight">Get</span>
            <span className="text-base font-black tracking-tight" style={{
              background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Screwed</span>
            <span className="text-base font-black text-brand-text tracking-tight">Score</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 active:bg-red-700 transition-colors"
          >
            Check mine
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-5 relative">

        {/* Shared by banner */}
        <div className="text-center space-y-1 animate-fade-up">
          <p className="text-xs text-brand-sub font-medium">
            Someone shared their Screwed Score with you
          </p>
          <p className="text-[10px] text-brand-sub/50">
            {DOCUMENT_TYPE_LABELS[analysis.document_type]} · {new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Score card */}
        <div className="animate-fade-up delay-100">
          <ScoreCard result={analysis} analysisId={analysis.id} isPublic />
        </div>

        {/* Findings */}
        <div className="animate-fade-up delay-200">
          <FindingsList findings={analysis.top_findings} maxVisible={4} />
        </div>

        {/* CTA block */}
        <div className="animate-fade-up delay-300 rounded-2xl border border-red-500/20 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,59,48,0.08) 0%, rgba(255,59,48,0.03) 100%)',
            boxShadow: '0 0 40px rgba(255,59,48,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
          <div className="p-8 text-center space-y-5">
            <div className="space-y-2">
              <div className="text-3xl animate-float">🔍</div>
              <p className="text-xl font-black text-brand-text">Check your own documents</p>
              <p className="text-sm text-brand-sub max-w-xs mx-auto">
                Free. No account required. Find out if you&apos;re getting screwed in ~20 seconds.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 active:bg-red-700 transition-all text-sm"
              style={{ boxShadow: '0 0 30px rgba(255,59,48,0.4)' }}
            >
              Get my Screwed Score
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-[11px] text-brand-sub/50 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              Mechanic invoices · Medical bills · Leases · Brand deals · More
            </p>
          </div>
        </div>

        {/* Email capture */}
        <div className="animate-fade-up delay-400">
          <EmailCapture analysisId={analysis.id} source="share_page" />
        </div>
      </main>

      <footer className="border-t border-brand-border mt-16 py-6">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between text-xs text-brand-sub">
          <span>© 2025 GetScrewedScore · Not legal or financial advice</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-brand-text transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-brand-text transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
