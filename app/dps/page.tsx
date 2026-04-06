import { ArrowRight, Layers, BarChart2, Cpu, Globe, Zap, CheckCircle } from 'lucide-react'

const SERVICES = [
  {
    icon: Globe,
    title: 'Brand Architecture',
    desc: 'Full identity system — positioning, messaging, visual language, and competitive differentiation engineered from the ground up.',
    tag: 'Foundation',
  },
  {
    icon: Layers,
    title: 'Content Strategy & Execution',
    desc: 'Long-form authority content, short-form velocity, and platform-specific playbooks that compound over time.',
    tag: 'Growth',
  },
  {
    icon: Cpu,
    title: 'System & Automation Build',
    desc: 'Backend operational infrastructure — CRM flows, content pipelines, lead capture, and revenue automation.',
    tag: 'Infrastructure',
  },
  {
    icon: BarChart2,
    title: 'Analytics & Intelligence',
    desc: 'Custom reporting dashboards that surface what matters. Know your numbers, accelerate what works, cut what doesn\'t.',
    tag: 'Intelligence',
  },
  {
    icon: Zap,
    title: 'Launch & Monetization',
    desc: 'Offer architecture, launch sequences, and positioning designed to convert authority into income.',
    tag: 'Revenue',
  },
]

const OUTCOMES = [
  'Cohesive brand identity across every touchpoint',
  'Content system that operates without you',
  'Audience growth on the platforms that matter',
  'Revenue-generating automation in place',
  'Clear analytics — no more guessing',
  'Premium positioning that commands premium prices',
]

export default function DPSPage() {
  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">

      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] h-[70vh]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,229,255,0.055) 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 right-0 w-[60vw] h-[50vh]"
          style={{ background: 'radial-gradient(ellipse at bottom right, rgba(0,229,255,0.025) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
        <div className="absolute inset-0 noise-bg" />
      </div>

      <main className="relative">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center justify-center min-h-[85vh] px-5 sm:px-8 pt-20 pb-20 text-center">

          <p className="animate-fade-up text-[11px] font-bold uppercase tracking-[0.25em] mb-8"
            style={{ color: 'rgba(0,229,255,0.6)' }}>
            Digital Prestige Serve
          </p>

          <div className="animate-fade-up delay-100 mb-8 max-w-4xl mx-auto">
            <h1 className="font-black tracking-tighter leading-[1.0]"
              style={{ fontSize: 'clamp(48px, 9vw, 100px)' }}>
              <span className="text-brand-text">Your digital presence</span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #67e8f9 0%, #00E5FF 50%, #0088cc 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 60px rgba(0,229,255,0.3))',
              }}>
                served at scale.
              </span>
            </h1>
          </div>

          <p className="animate-fade-up delay-200 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed mb-10"
            style={{ color: 'rgba(242,242,242,0.55)' }}>
            Done-for-you digital infrastructure for creators and founders
            who are done operating below their level.
          </p>

          <div className="animate-fade-up delay-300 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:hello@rembydesign.com?subject=DPS%20Inquiry"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #67e8f9, #00E5FF)',
                boxShadow: '0 0 40px rgba(0,229,255,0.3)',
              }}>
              Request DPS Evaluation <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#services"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-brand-sub hover:text-brand-text border border-brand-border hover:bg-brand-muted transition-colors">
              View Services
            </a>
          </div>

          {/* Credibility row */}
          <div className="animate-fade-up delay-500 flex flex-wrap items-center justify-center gap-6 mt-14 text-xs"
            style={{ color: 'rgba(242,242,242,0.3)' }}>
            {['Strategy-first approach', 'No retainer lock-in', 'White-glove execution', 'Results-driven'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-cyan-500/50" /> {t}
              </span>
            ))}
          </div>
        </section>

        {/* ── Services ─────────────────────────────────────────────────── */}
        <section id="services" className="max-w-5xl mx-auto px-5 sm:px-8 pb-24">
          <div className="text-center space-y-3 mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: 'rgba(0,229,255,0.5)' }}>
              What DPS includes
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
              Built for operators, not spectators.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map(({ icon: Icon, title, desc, tag }) => (
              <div key={title}
                className="glass-card rounded-2xl p-6 space-y-4 transition-all duration-300 hover:border-cyan-500/20"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }}>
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(0,229,255,0.08)', color: 'rgba(0,229,255,0.7)', border: '1px solid rgba(0,229,255,0.12)' }}>
                    {tag}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p className="font-bold text-brand-text text-base">{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.5)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Outcomes ─────────────────────────────────────────────────── */}
        <section className="border-t border-brand-border/30 py-24 px-5 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
                  style={{ color: 'rgba(0,229,255,0.5)' }}>
                  What you get
                </p>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight leading-tight">
                  Built for unfair<br />
                  <span style={{
                    background: 'linear-gradient(135deg, #67e8f9, #00E5FF)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>advantage.</span>
                </h2>
                <p className="text-brand-sub/60 leading-relaxed max-w-sm">
                  Every DPS engagement is custom-scoped. No packages. No templates. No copy-paste strategy.
                </p>
              </div>
              <div className="space-y-3">
                {OUTCOMES.map(item => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-brand-sub/75">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-24 px-5 sm:px-8 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
              Ready to operate at a<br />different level?
            </h2>
            <p className="text-brand-sub/60 text-lg">
              DPS is selective. We take on a limited number of engagements to ensure quality.
            </p>
            <a href="mailto:hello@rembydesign.com?subject=DPS%20Inquiry"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #67e8f9, #00E5FF)',
                boxShadow: '0 0 60px rgba(0,229,255,0.25)',
              }}>
              Request an Evaluation <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

      </main>
    </div>
  )
}
