import { ArrowRight, Download, Cpu, FileText, TrendingUp, Layout, Zap, Star } from 'lucide-react'

const PRODUCTS = [
  {
    icon: Layout,
    category: 'Systems',
    title: 'Creator OS Bundle',
    desc: 'Complete operating system for digital creators. Notion templates, automation playbooks, and workflow architecture to run your business like a machine.',
    price: '$97',
    badge: 'Best Seller',
    badgeColor: 'rgba(0,229,255,0.8)',
  },
  {
    icon: Cpu,
    category: 'Automation',
    title: 'Content Pipeline Pro',
    desc: 'End-to-end content automation system. Ideation → production → distribution → repurposing. Built in Make/Zapier. Works while you sleep.',
    price: '$147',
    badge: null,
    badgeColor: '',
  },
  {
    icon: FileText,
    category: 'Templates',
    title: 'Brand Deal Negotiation Pack',
    desc: '12 proven email scripts and contract templates for brand partnerships. Stop leaving money on the table in negotiations.',
    price: '$49',
    badge: null,
    badgeColor: '',
  },
  {
    icon: TrendingUp,
    category: 'Analytics',
    title: 'Revenue Dashboard Kit',
    desc: 'Custom Google Sheets + Notion dashboard that consolidates your income streams, tracks growth, and surfaces opportunities.',
    price: '$67',
    badge: 'New',
    badgeColor: 'rgba(48,209,88,0.8)',
  },
  {
    icon: Download,
    category: 'Assets',
    title: 'Social Media Asset Pack',
    desc: '200+ Canva templates designed for premium positioning. Covers YouTube, Instagram, LinkedIn, TikTok, and Twitter/X.',
    price: '$37',
    badge: null,
    badgeColor: '',
  },
  {
    icon: Zap,
    category: 'Systems',
    title: 'Launch Sequence Playbook',
    desc: 'Step-by-step digital product launch system. Email sequences, pre-launch content plan, and post-launch optimization framework.',
    price: '$89',
    badge: null,
    badgeColor: '',
  },
]

const VALUE_BLOCKS = [
  {
    stat: '10×',
    label: 'Faster content production',
    desc: 'Automation removes 80% of repetitive work from your workflow.',
    color: '#00E5FF',
  },
  {
    stat: '$0',
    label: 'Ongoing software cost',
    desc: 'One-time purchase. No subscriptions. No recurring fees.',
    color: '#30d158',
  },
  {
    stat: '48h',
    label: 'To full implementation',
    desc: 'Every system is built to deploy immediately, not sit in a folder.',
    color: '#ffd60a',
  },
]

export default function ProductivityPage() {
  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">

      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] h-[65vh]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,229,255,0.04) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
        <div className="absolute inset-0 noise-bg" />
      </div>

      <main className="relative">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center justify-center min-h-[80vh] px-5 sm:px-8 pt-20 pb-16 text-center overflow-hidden">

          <p className="animate-fade-up text-[11px] font-bold uppercase tracking-[0.25em] mb-8"
            style={{ color: 'rgba(0,229,255,0.6)' }}>
            Productivity Digital Media
          </p>

          <div className="animate-fade-up delay-100 mb-6 max-w-4xl mx-auto">
            <h1 className="font-black tracking-tighter leading-[1.0]"
              style={{ fontSize: 'clamp(40px, 8vw, 90px)' }}>
              <span className="text-brand-text">Tools engineered for creators</span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #f2f2f2 0%, #00E5FF 60%, #67e8f9 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 40px rgba(0,229,255,0.2))',
              }}>
                who refuse average speed.
              </span>
            </h1>
          </div>

          <p className="animate-fade-up delay-200 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed mb-10"
            style={{ color: 'rgba(242,242,242,0.5)' }}>
            Elite-grade digital assets, automations, and productivity systems
            designed to scale your income and eliminate friction.
          </p>

          <a href="#products"
            className="animate-fade-up delay-300 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,229,255,0.05))',
              border: '1px solid rgba(0,229,255,0.3)',
              color: '#00E5FF',
              boxShadow: '0 0 30px rgba(0,229,255,0.1)',
            }}>
            Browse the Collection <ArrowRight className="w-4 h-4" />
          </a>
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

        {/* ── Products ─────────────────────────────────────────────────── */}
        <section id="products" className="max-w-6xl mx-auto px-5 sm:px-8 py-24">
          <div className="text-center space-y-3 mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: 'rgba(0,229,255,0.5)' }}>
              The collection
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
              Operate like a billion-dollar org.
            </h2>
            <p className="text-brand-sub/50 text-sm max-w-sm mx-auto">
              Without the headcount. Without the overhead.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCTS.map(({ icon: Icon, category, title, desc, price, badge, badgeColor }) => (
              <div key={title}
                className="glass-card rounded-2xl p-6 space-y-4 transition-all duration-300 hover:border-white/10 flex flex-col"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.12)' }}>
                      <Icon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-sub/50">
                      {category}
                    </span>
                  </div>
                  {badge && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ background: `${badgeColor}15`, color: badgeColor, border: `1px solid ${badgeColor}30` }}>
                      {badge}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <p className="font-bold text-brand-text">{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.45)' }}>{desc}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-brand-border/30">
                  <span className="text-xl font-black text-brand-text">{price}</span>
                  <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-80"
                    style={{
                      background: 'rgba(0,229,255,0.1)',
                      color: '#00E5FF',
                      border: '1px solid rgba(0,229,255,0.2)',
                    }}>
                    Get it <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Social proof ─────────────────────────────────────────────── */}
        <section className="border-t border-brand-border/30 py-24 px-5 sm:px-8 text-center">
          <div className="max-w-xl mx-auto space-y-6">
            <div className="flex justify-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-xl sm:text-2xl font-bold text-brand-text/80 leading-relaxed">
              "The Creator OS Bundle alone saved me 15 hours a week. The content pipeline runs itself."
            </p>
            <p className="text-sm text-brand-sub/50">— Jordan R., Full-time Creator</p>
          </div>
        </section>

      </main>
    </div>
  )
}
