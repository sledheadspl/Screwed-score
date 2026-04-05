'use client'

import { useState, useEffect } from 'react'
import {
  Shield, Lock, Loader2, FileText, Phone, CreditCard,
  AlertTriangle, Mail, Copy, Download, ChevronDown, ChevronUp, CheckCircle,
} from 'lucide-react'
import type { KitContent } from '@/pages/api/kit-generate'

interface Props {
  analysisId: string
  score: 'SCREWED' | 'MAYBE' | 'SAFE'
}

// ── Kit section (collapsible) ────────────────────────────────────────────────
function KitSection({
  icon: Icon, title, color, children, defaultOpen = false,
}: {
  icon: React.ElementType; title: string; color: string
  children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-brand-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-brand-muted/40 transition-colors">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: color + '15', border: `1px solid ${color}30` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-sm font-bold text-brand-text flex-1">{title}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-brand-sub/40 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-brand-sub/40 shrink-0" />
        }
      </button>
      {open && (
        <div className="border-t border-brand-border bg-brand-bg/40">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Copy + download helpers ──────────────────────────────────────────────────
function copyText(text: string) {
  navigator.clipboard.writeText(text)
}
function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Unlocked kit display ─────────────────────────────────────────────────────
function KitUnlocked({ kit }: { kit: KitContent }) {
  const [emailTab, setEmailTab] = useState<'day3' | 'day7' | 'day14'>('day3')

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'rgba(74,222,128,0.2)', background: 'linear-gradient(135deg, rgba(74,222,128,0.05) 0%, rgba(13,13,15,0.9) 100%)' }}>

      {/* Header */}
      <div className="px-5 py-4 border-b border-brand-border/40 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <p className="font-black text-brand-text">Fight Back Kit</p>
          <p className="text-xs text-brand-sub">Use each tool below to get your money back</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 shrink-0">
          <CheckCircle className="w-3 h-3 text-green-400" />
          <span className="text-xs font-bold text-green-400">Unlocked</span>
        </div>
      </div>

      <div className="p-4 space-y-2">

        {/* Demand letter */}
        <KitSection icon={FileText} title="Professional Demand Letter" color="#60a5fa" defaultOpen>
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <button onClick={() => copyText(kit.demand_letter)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-border bg-brand-muted hover:bg-brand-surface transition-colors text-brand-sub">
                <Copy className="w-3 h-3" /> Copy
              </button>
              <button onClick={() => downloadText(kit.demand_letter, 'demand-letter.txt')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-border bg-brand-muted hover:bg-brand-surface transition-colors text-brand-sub">
                <Download className="w-3 h-3" /> Download .txt
              </button>
            </div>
            <p className="text-[10px] text-blue-400/60">
              Fill in [YOUR NAME], [DATE], and contact details before sending. Keep a copy for your records.
            </p>
            <pre className="text-sm text-brand-sub whitespace-pre-wrap font-sans leading-relaxed">{kit.demand_letter}</pre>
          </div>
        </KitSection>

        {/* Phone script */}
        <KitSection icon={Phone} title="Phone Script — Word for Word" color="#f59e0b">
          <div className="p-4 space-y-3">
            <button onClick={() => copyText(kit.phone_script)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-border bg-brand-muted hover:bg-brand-surface transition-colors text-brand-sub">
              <Copy className="w-3 h-3" /> Copy script
            </button>
            <pre className="text-sm text-brand-sub whitespace-pre-wrap font-sans leading-relaxed">{kit.phone_script}</pre>
          </div>
        </KitSection>

        {/* Chargeback guide */}
        <KitSection icon={CreditCard} title="Credit Card Chargeback Guide" color="#a78bfa">
          <div className="p-4">
            <pre className="text-sm text-brand-sub whitespace-pre-wrap font-sans leading-relaxed">{kit.chargeback_guide}</pre>
          </div>
        </KitSection>

        {/* Escalation path */}
        <KitSection icon={AlertTriangle} title="Escalation Path" color="#f87171">
          <div className="p-4">
            <ol className="space-y-2.5">
              {kit.escalation_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-brand-sub">
                  <span className="text-[10px] font-black text-red-500/60 mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span>{step.replace(/^Step\s*\d+:\s*/i, '')}</span>
                </li>
              ))}
            </ol>
          </div>
        </KitSection>

        {/* Follow-up emails */}
        <KitSection icon={Mail} title="Follow-up Email Sequence (3, 7, 14 days)" color="#4ade80">
          <div className="p-4 space-y-3">
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-brand-muted border border-brand-border">
              {(['day3', 'day7', 'day14'] as const).map(tab => (
                <button key={tab} onClick={() => setEmailTab(tab)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    emailTab === tab ? 'bg-brand-surface text-brand-text' : 'text-brand-sub hover:text-brand-text'
                  }`}>
                  {tab === 'day3' ? 'Day 3' : tab === 'day7' ? 'Day 7' : 'Day 14 (Final)'}
                </button>
              ))}
            </div>
            <button onClick={() => copyText(kit.followup_emails[emailTab])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-border bg-brand-muted hover:bg-brand-surface transition-colors text-brand-sub">
              <Copy className="w-3 h-3" /> Copy email
            </button>
            <pre className="text-sm text-brand-sub whitespace-pre-wrap font-sans leading-relaxed">{kit.followup_emails[emailTab]}</pre>
          </div>
        </KitSection>

      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export function FightBackKit({ analysisId, score }: Props) {
  const [kit,      setKit]      = useState<KitContent | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // On mount: check localStorage cache, then check for kit_session URL param
  useEffect(() => {
    const cached = localStorage.getItem(`kit_${analysisId}`)
    if (cached) {
      try { setKit(JSON.parse(cached)); return } catch {}
    }

    const params    = new URLSearchParams(window.location.search)
    const kitSession = params.get('kit_session')
    if (kitSession) {
      // Clean URL immediately so refresh doesn't retrigger
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
      generateKit(kitSession)
    }
  }, [analysisId]) // eslint-disable-line react-hooks/exhaustive-deps

  const generateKit = async (sessionId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/kit-generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ session_id: sessionId, analysis_id: analysisId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      localStorage.setItem(`kit_${analysisId}`, JSON.stringify(data.kit))
      setKit(data.kit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate kit. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/kit-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analysis_id: analysisId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      if (data.url) window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout. Please try again.')
      setLoading(false)
    }
  }

  if (score === 'SAFE') return null

  // Generating state
  if (loading) {
    return (
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-8 text-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-red-400 mx-auto" />
        <p className="text-sm font-bold text-brand-text">Building your Fight Back Kit...</p>
        <p className="text-xs text-brand-sub">Personalizing demand letter, phone script, and more — about 10 seconds</p>
      </div>
    )
  }

  // Unlocked
  if (kit) return <KitUnlocked kit={kit} />

  // Locked teaser
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'rgba(255,59,48,0.25)', background: 'linear-gradient(135deg, rgba(255,59,48,0.07) 0%, rgba(13,13,15,0.95) 100%)', boxShadow: '0 0 40px rgba(255,59,48,0.08)' }}>

      {/* Header */}
      <div className="px-5 py-4 border-b border-brand-border/40 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="font-black text-brand-text">Fight Back Kit</p>
          <p className="text-xs text-brand-sub">Everything you need to get your money back</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 shrink-0">
          <Lock className="w-3 h-3 text-red-400" />
          <span className="text-xs font-black text-red-400">$14.99</span>
        </div>
      </div>

      {/* What's inside (locked) */}
      <div className="p-5 space-y-2.5">
        {[
          { icon: FileText,      color: '#60a5fa', label: 'Professional Demand Letter',       desc: 'Personalized to your exact charges — ready to send' },
          { icon: Phone,         color: '#f59e0b', label: 'Word-for-Word Phone Script',       desc: 'Exactly what to say when they answer, including pushback responses' },
          { icon: CreditCard,    color: '#a78bfa', label: 'Credit Card Chargeback Guide',     desc: 'Step-by-step instructions to dispute via your card network' },
          { icon: AlertTriangle, color: '#f87171', label: 'Escalation Path',                  desc: 'BBB, state AG, small claims — exactly when and how to use each' },
          { icon: Mail,          color: '#4ade80', label: '3-Part Follow-Up Email Sequence',  desc: 'Day 3, 7, and 14 — escalating pressure until they respond' },
        ].map(({ icon: Icon, color, label, desc }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: color + '12', border: `1px solid ${color}25` }}>
              <Icon className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <div className="min-w-0 flex-1 select-none" style={{ filter: 'blur(3px)' }}>
              <p className="text-sm font-semibold text-brand-text truncate">{label}</p>
              <p className="text-xs text-brand-sub truncate">{desc}</p>
            </div>
            <Lock className="w-3.5 h-3.5 text-brand-sub/30 shrink-0" />
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-5 pb-5 space-y-3">
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <button onClick={handlePurchase} disabled={loading}
          className="w-full py-4 rounded-xl font-black text-base text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)', boxShadow: '0 0 40px rgba(255,59,48,0.35)' }}>
          Get Fight Back Kit — $14.99
        </button>

        <div className="flex items-center justify-center gap-4 text-xs text-brand-sub/50">
          <span>One-time · No subscription</span>
          <span>·</span>
          <span>Instant delivery</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-green-400/70">
          <CheckCircle className="w-3 h-3" />
          <span>Avg. user who disputes recovers $400+</span>
        </div>
      </div>
    </div>
  )
}
