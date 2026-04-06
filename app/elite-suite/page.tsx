import { ArrowRight, Shield, Cpu, BarChart2, Layers, Headphones, Zap, Lock, Star } from 'lucide-react'

const DELIVERABLES = [
  {
    icon: Cpu,
    title: 'Fully Automated Productivity System',
    desc: 'Every repetitive task in your business and personal life identified, documented, and automated. Your time returned to you.',
  },
  {
    icon: BarChart2,
    title: 'Custom Command Dashboards',
    desc: 'Business, personal, and investment dashboards built to your exact workflow. One view. Total clarity.',
  },
  {
    icon: Layers,
    title: 'AI-Powered Media Management',
    desc: 'Intelligent content organization, tagging, repurposing, and distribution. Your media library works for you.',
  },
  {
    icon: Zap,
    title: 'Automated Content Pipelines',
    desc: 'Multi-platform content distribution running on autopilot. Ideation to publish — systemized.',
  },
  {
    icon: Shield,
    title: 'Digital Asset Organization',
    desc: 'Complete audit and reorganization of every digital asset. Contracts, media, financials — secured and accessible.',
  },
  {
    icon: Headphones,
    title: 'White-Glove Setup & Priority Support',
    desc: 'We build everything. You approve. Ongoing priority support with guaranteed response times.',
  },
]

const PROCESS_STEPS = [
  {
    n: '01',
    title: 'Private Application',
    desc: 'Submit your application. We review within 48 hours. Not every application is accepted.',
  },
  {
    n: '02',
    title: 'Discovery Session',
    desc: 'A 90-minute strategy session to map your entire digital ecosystem, pain points, and objectives.',
  },
  {
    n: '03',
    title: 'Custom Architecture',
    desc: 'We architect your complete Digital Powerhouse Suite™ — every component custom-built to your life.',
  },
  {
    n: '04',
    title: 'White-Glove Deployment',
    desc: 'Full implementation handled by our team. You receive a fully operational system, not a DIY guide.',
  },
]

export default function EliteSuitePage() {
  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">

      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] h-[80vh]"
          style={{ background: 'radial-gradient(ellipse, rgba(255,215,0,0.045) 0%, transparent 58%)' }} />
        <div className="absolute bottom-0 left-0 w-[70vw] h-[50vh]"
          style={{ background: 'radial-gradient(ellipse at bottom left, rgba(255,215,0,0.02) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
        <div className="absolute inset-0 noise-bg" />
      </div>

      <main className="relative">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-5 sm:px-8 pt-20 pb-20 text-center overflow-hidden">

          {/* Private access badge */}
          <div className="animate-fade-up flex items-center gap-2 px-4 py-2 rounded-full border mb-8"
            style={{
              borderColor: 'rgba(255,215,0,0.2)',
              background: 'rgba(255,215,0,0.05)',
            }}>
            <Lock className="w-3 h-3" style={{ color: 'rgba(255,215,0,0.7)' }} />
            <span className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(255,215,0,0.7)' }}>
              Private Application Only
            </span>
          </div>

          <div className="animate-fade-up delay-100 mb-6 max-w-4xl mx-auto">
            <p className="font-black text-brand-text/40 tracking-tight mb-2"
              style={{ fontSize: 'clamp(16px, 2.5vw, 22px)' }}>
              The Digital Powerhouse Suite™
            </p>
            <h1 className="font-black tracking-tighter leading-[0.95]"
              style={{ fontSize: 'clamp(44px, 9vw, 108px)' }}>
              <span className="text-brand-text">Your time is too</span>
              <br />
              <span className="text-brand-text">valuable for</span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #fff7aa 0%, #ffd700 40%, #b8860b 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 80px rgba(255,215,0,0.35))',
              }}>
                digital friction.
              </span>
            </h1>
          </div>

          <p className="animate-fade-up delay-200 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed mb-4"
            style={{ color: 'rgba(242,242,242,0.5)' }}>
            This is operational dominance for the elite.
          </p>
          <p className="animate-fade-up delay-300 text-sm max-w-md mx-auto leading-relaxed mb-12"
            style={{ color: 'rgba(242,242,242,0.3)' }}>
            A private, concierge-level digital ecosystem engineered for high-net-worth creators, founders, and investors.
          </p>

          <div className="animate-fade-up delay-400 space-y-4">
            <a href="mailto:sledheadspl@gmail.com?subject=Elite%20Suite%20Application"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold text-black transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #fff7aa, #ffd700, #cc9900)',
                boxShadow: '0 0 60px rgba(255,215,0,0.3), 0 0 120px rgba(255,215,0,0.1)',
              }}>
              Apply for Access <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-[11px] text-brand-sub/35 text-center">
              Applications reviewed within 48 hours · Not all applications accepted
            </p>
          </div>

          {/* Price anchor */}
          <div className="animate-fade-up delay-500 mt-16 px-8 py-5 rounded-2xl border"
            style={{
              borderColor: 'rgba(255,215,0,0.15)',
              background: 'rgba(255,215,0,0.04)',
            }}>
            <div className="flex items-baseline gap-3 justify-center">
              <span className="font-black text-brand-text" style={{ fontSize: 'clamp(32px, 5vw, 48px)' }}>$7,500</span>
              <span className="text-brand-sub/50 text-sm">setup</span>
              <span className="text-brand-sub/30">+</span>
              <span className="font-bold text-brand-text/70 text-xl">$297<span className="text-sm font-normal text-brand-sub/50">/mo</span></span>
            </div>
            <p className="text-xs text-center mt-1.5" style={{ color: 'rgba(242,242,242,0.3)' }}>
              White-glove setup included · Priority support · Exclusive upgrades
            </p>
          </div>
        </section>

        {/* ── What the elite don't do ─────────────────────────────────── */}
        <section className="border-t border-brand-border/30 py-24 px-5 sm:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] mb-8"
              style={{ color: 'rgba(255,215,0,0.5)' }}>
              The principle
            </p>
            <p className="font-black tracking-tight leading-[1.05] text-brand-text"
              style={{ fontSize: 'clamp(28px, 5vw, 54px)' }}>
              The elite don&apos;t manage their digital life.
            </p>
            <p className="font-black tracking-tight leading-[1.05] mt-1"
              style={{ fontSize: 'clamp(28px, 5vw, 54px)', color: 'rgba(242,242,242,0.2)' }}>
              They command it.
            </p>
            <p className="text-brand-sub/50 text-lg mt-8 max-w-xl mx-auto leading-relaxed">
              Every system in your digital life — automated, organized, and working on your behalf. 24 hours a day.
            </p>
          </div>
        </section>

        {/* ── Deliverables ─────────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-5 sm:px-8 pb-24">
          <div className="text-center space-y-3 mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: 'rgba(255,215,0,0.5)' }}>
              What&apos;s included
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
              Every component. Custom-built.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {DELIVERABLES.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="glass-card rounded-2xl p-6 space-y-3 transition-all duration-300 hover:border-yellow-500/20 animate-border-gold"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.15)' }}>
                    <Icon className="w-5 h-5" style={{ color: 'rgba(255,215,0,0.8)' }} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-brand-text text-sm">{title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.45)' }}>{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Process ──────────────────────────────────────────────────── */}
        <section className="border-t border-brand-border/30 py-24 px-5 sm:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-3 mb-14">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
                style={{ color: 'rgba(255,215,0,0.5)' }}>
                The process
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
                Concierge from day one.
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {PROCESS_STEPS.map(({ n, title, desc }) => (
                <div key={n} className="relative p-6 rounded-2xl border border-brand-border/30 space-y-2"
                  style={{ background: 'rgba(15,15,15,0.4)' }}>
                  <div className="absolute top-4 right-5 font-black text-brand-text/[0.04] select-none"
                    style={{ fontSize: '72px', lineHeight: 1 }}>
                    {n}
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'rgba(255,215,0,0.5)' }}>
                    Step {n}
                  </p>
                  <p className="font-bold text-brand-text">{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.45)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonial ──────────────────────────────────────────────── */}
        <section className="border-t border-brand-border/30 py-24 px-5 sm:px-8 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-xl sm:text-2xl font-bold leading-relaxed"
              style={{ color: 'rgba(242,242,242,0.75)' }}>
              &ldquo;The Digital Powerhouse Suite gave me back 20 hours a week and total clarity on my business. It&apos;s not a product — it&apos;s infrastructure.&rdquo;
            </p>
            <p className="text-sm text-brand-sub/40">— Private Client, 7-Figure Creator</p>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section className="py-24 px-5 sm:px-8 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
              Ready to command your<br />digital life?
            </h2>
            <p className="text-brand-sub/50 max-w-sm mx-auto">
              Applications are reviewed personally. Spots are limited to maintain the quality of service each client deserves.
            </p>
            <div className="space-y-3">
              <a href="mailto:sledheadspl@gmail.com?subject=Elite%20Suite%20Application"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold text-black transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #fff7aa, #ffd700, #cc9900)',
                  boxShadow: '0 0 60px rgba(255,215,0,0.25)',
                }}>
                Apply for Access <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-[11px] text-brand-sub/30">
                Starts at $7,500 setup + $297/month maintenance
              </p>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
