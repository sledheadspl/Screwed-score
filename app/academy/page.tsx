'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, FileSearch, Gauge, Ear, Scale, Loader2, GraduationCap, Layers, Download, ShieldCheck, Users, type LucideIcon } from 'lucide-react'

interface Course {
  id: string
  icon: LucideIcon
  title: string
  subtitle: string
  price: string
  modules: number
  badge: string | null
}

const COURSES: Course[] = [
  {
    id: 'academy-estimate-mastery',
    icon: FileSearch,
    title: 'Repair Estimate Mastery',
    subtitle: 'Read, question, and negotiate any auto repair estimate like a service advisor would.',
    price: '$39',
    modules: 7,
    badge: 'Best Seller',
  },
  {
    id: 'academy-check-engine',
    icon: Gauge,
    title: 'Check Engine Light: Complete Diagnostic Course',
    subtitle: 'Read OBD2 codes like a technician and follow a real diagnostic tree instead of guessing at parts.',
    price: '$39',
    modules: 7,
    badge: null,
  },
  {
    id: 'academy-noise-diagnosis',
    icon: Ear,
    title: 'Car Noise Diagnosis: Complete Course',
    subtitle: "Train your ear system by system and stop guessing at what's making that sound.",
    price: '$29',
    modules: 7,
    badge: null,
  },
  {
    id: 'academy-fight-back',
    icon: Scale,
    title: 'Fight Back: Complete Dispute & Consumer Protection Course',
    subtitle: 'Win almost any dispute — bad bill, bad charge, bad service — with the letters already written.',
    price: '$39',
    modules: 7,
    badge: null,
  },
]

const VALUE_BLOCKS = [
  { stat: '4', label: 'Complete courses', desc: '28 modules total, built from real shop-floor experience.', color: '#ffd60a' },
  { stat: '$40', label: 'Saved with the bundle', desc: 'All four courses for $106 instead of $146 apart.', color: '#30d158' },
  { stat: '∞', label: 'Yours to keep', desc: 'Instant download, no subscription, no expiration.', color: '#00E5FF' },
]

function BuyButton({ productId, label, style }: { productId: string; label: string; style: React.CSSProperties }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBuy = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/product-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleBuy}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
        style={style}
      >
        {loading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Redirecting…</>) : (<>{label} <ArrowRight className="w-3.5 h-3.5" /></>)}
      </button>
      {error && <p className="text-[11px] text-red-400 max-w-[160px] text-right">{error}</p>}
    </div>
  )
}

function CourseCard({ course }: { course: Course }) {
  const Icon = course.icon
  return (
    <div className="glass-card rounded-2xl p-6 space-y-4 transition-all duration-300 hover:border-white/10 flex flex-col"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.18)' }}>
            <Icon className="w-4 h-4" style={{ color: '#ffd60a' }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-sub/50">
            {course.modules} Modules
          </span>
        </div>
        {course.badge && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,214,10,0.15)', color: '#ffd60a', border: '1px solid rgba(255,214,10,0.3)' }}>
            {course.badge}
          </span>
        )}
      </div>

      <div className="space-y-1.5 flex-1">
        <p className="font-bold text-brand-text">{course.title}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.45)' }}>
          {course.subtitle}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-brand-border/30">
        <span className="text-xl font-black text-brand-text">{course.price}</span>
        <BuyButton
          productId={course.id}
          label="Get it"
          style={{ background: 'rgba(255,214,10,0.1)', color: '#ffd60a', border: '1px solid rgba(255,214,10,0.25)' }}
        />
      </div>
    </div>
  )
}

export default function AcademyPage() {
  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">

      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] h-[65vh]"
          style={{ background: 'radial-gradient(ellipse, rgba(255,214,10,0.05) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
        <div className="absolute inset-0 noise-bg" />
      </div>

      <main className="relative">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center justify-center min-h-[80vh] px-5 sm:px-8 pt-20 pb-16 text-center overflow-hidden">

          <p className="animate-fade-up text-[11px] font-bold uppercase tracking-[0.25em] mb-8 flex items-center gap-2"
            style={{ color: 'rgba(255,214,10,0.7)' }}>
            <GraduationCap className="w-3.5 h-3.5" /> ScrewedScore Academy
          </p>

          <div className="animate-fade-up delay-100 mb-6 max-w-4xl mx-auto">
            <h1 className="font-black tracking-tighter leading-[1.0]"
              style={{ fontSize: 'clamp(40px, 8vw, 90px)' }}>
              <span className="text-brand-text">Stop guessing.</span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #f2f2f2 0%, #ffd60a 60%, #ffe680 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 40px rgba(255,214,10,0.2))',
              }}>
                Start knowing.
              </span>
            </h1>
          </div>

          <p className="animate-fade-up delay-200 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed mb-10"
            style={{ color: 'rgba(242,242,242,0.5)' }}>
            Four complete courses that turn you into your own best advocate — reading estimates,
            diagnosing your car, and fighting back when something's wrong.
          </p>

          <div className="animate-fade-up delay-300 flex flex-wrap items-center justify-center gap-3">
            <a href="#courses"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(255,214,10,0.18), rgba(255,214,10,0.06))',
                border: '1px solid rgba(255,214,10,0.35)',
                color: '#ffd60a',
                boxShadow: '0 0 30px rgba(255,214,10,0.12)',
              }}>
              Browse the Courses <ArrowRight className="w-4 h-4" />
            </a>
            <Link href="/academy/community"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02] text-brand-sub border border-brand-border hover:text-brand-text hover:bg-brand-muted">
              <Users className="w-4 h-4" /> Join the Community
            </Link>
          </div>
        </section>

        {/* ── Value blocks ─────────────────────────────────────────────── */}
        <section className="border-t border-b border-brand-border/30 py-14">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
              {VALUE_BLOCKS.map(({ stat, label, desc, color }, idx) => (
                <div key={label} className={`px-8 py-8 text-center ${idx > 0 ? 'border-t sm:border-t-0 sm:border-l border-brand-border/20' : ''}`}>
                  <p className="font-black tracking-tighter leading-none mb-2"
                    style={{ fontSize: 'clamp(48px, 7vw, 72px)', color }}>
                    {stat}
                  </p>
                  <p className="text-sm font-bold text-brand-text mb-1.5">{label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.4)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Courses ──────────────────────────────────────────────────── */}
        <section id="courses" className="max-w-6xl mx-auto px-5 sm:px-8 py-24">
          <div className="text-center space-y-3 mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: 'rgba(255,214,10,0.6)' }}>
              The courses
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
              Learn it once. Use it forever.
            </h2>
            <p className="text-brand-sub/50 text-sm max-w-sm mx-auto">
              Every course is text-and-visual, self-paced, and yours to keep after purchase.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {COURSES.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          {/* Bundle card */}
          <div className="rounded-2xl p-7 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{
              background: 'linear-gradient(135deg, rgba(255,214,10,0.08), rgba(255,214,10,0.02))',
              border: '1px solid rgba(255,214,10,0.3)',
            }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,214,10,0.12)', border: '1px solid rgba(255,214,10,0.3)' }}>
                <Layers className="w-5 h-5" style={{ color: '#ffd60a' }} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#ffd60a' }}>Complete Bundle</p>
                <p className="font-black text-xl text-brand-text">All 4 courses — 28 modules</p>
                <p className="text-sm" style={{ color: 'rgba(242,242,242,0.45)' }}>
                  <span className="line-through opacity-60">$146</span> for $106 when bought together.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <span className="text-3xl font-black" style={{ color: '#ffd60a' }}>$106</span>
              <BuyButton
                productId="academy-bundle"
                label="Get the bundle"
                style={{
                  background: 'linear-gradient(135deg, #ffe066, #ffd60a)',
                  color: '#0a0a0a',
                  fontWeight: 900,
                  padding: '12px 20px',
                }}
              />
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="border-t border-brand-border/30 py-20 px-5 sm:px-8">
          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-10 h-10 rounded-lg mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.18)' }}>
                <Download className="w-4 h-4" style={{ color: '#ffd60a' }} />
              </div>
              <p className="font-bold text-brand-text mb-1.5 text-sm">Instant access</p>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.4)' }}>
                Buy and unlock immediately — no waiting on an email, no login required.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.18)' }}>
                <GraduationCap className="w-4 h-4" style={{ color: '#ffd60a' }} />
              </div>
              <p className="font-bold text-brand-text mb-1.5 text-sm">Self-paced</p>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.4)' }}>
                Every module is text-and-visual, built to read on your phone or print out.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.18)' }}>
                <ShieldCheck className="w-4 h-4" style={{ color: '#ffd60a' }} />
              </div>
              <p className="font-bold text-brand-text mb-1.5 text-sm">Yours to keep</p>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.4)' }}>
                One-time purchase, no subscription. Download, save, and revisit anytime.
              </p>
            </div>
          </div>
        </section>

        {/* ── Community ────────────────────────────────────────────────── */}
        <section className="border-t border-brand-border/30 py-20 px-5 sm:px-8">
          <div className="max-w-3xl mx-auto rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left"
            style={{
              background: 'linear-gradient(135deg, rgba(255,214,10,0.06), rgba(255,214,10,0.01))',
              border: '1px solid rgba(255,214,10,0.2)',
            }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,214,10,0.1)', border: '1px solid rgba(255,214,10,0.28)' }}>
              <Users className="w-7 h-7" style={{ color: '#ffd60a' }} />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(255,214,10,0.7)' }}>
                You're not learning this alone
              </p>
              <h3 className="text-2xl font-black text-brand-text">The Academy Community</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.5)' }}>
                Ask a question about your specific estimate, noise, or dispute. Share a win when you
                catch an overcharge. Trade tips with people working through the same courses. Free
                to join, open to everyone.
              </p>
            </div>
            <Link href="/academy/community"
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #ffe066, #ffd60a)', color: '#0a0a0a' }}>
              Visit the Community <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── About the instructor ─────────────────────────────────────── */}
        <section className="border-t border-brand-border/30 py-24 px-5 sm:px-8 text-center">
          <div className="max-w-xl mx-auto space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(255,214,10,0.6)' }}>
              About the courses
            </p>
            <p className="text-lg sm:text-xl font-bold text-brand-text/80 leading-relaxed">
              Built by Ryan Morris, founder of Get Screwed Score and owner of REMbyDesign LLC —
              from real, shop-floor experience spotting overcharges and bad-faith repairs.
            </p>
            <p className="text-sm text-brand-sub/50">
              General information for educational purposes only — not legal, financial, or safety advice.
            </p>
          </div>
        </section>

      </main>
    </div>
  )
}
