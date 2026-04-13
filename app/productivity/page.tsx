'use client'

import { useState } from 'react'
import { ArrowRight, Download, Cpu, FileText, TrendingUp, Layout, Zap, Star, Loader2, Sparkles, Play, Mail, Flame, DollarSign, User, Shield, BarChart3, Video, BookOpen } from 'lucide-react'

interface Product {
  id: string
  icon: React.ComponentType<{ className?: string }>
  category: string
  title: string
  desc: string
  price: string
  badge: string | null
  badgeColor: string
}

const PRODUCTS: Product[] = [
  {
    id: 'clippilot-pro',
    icon: Video,
    category: 'Desktop App',
    title: 'ClipPilot Pro',
    desc: 'AI-powered auto-clip app for streamers. Detects your best moments, crops vertical, adds captions, and publishes to TikTok, YouTube Shorts & Twitter — automatically.',
    price: '$19/mo',
    badge: 'New',
    badgeColor: 'rgba(0,229,255,0.8)',
  },
  {
    id: 'creator-os',
    icon: Layout,
    category: 'Systems',
    title: 'Creator OS Bundle',
    desc: 'Complete operating system for digital creators. Notion templates, automation playbooks, and workflow architecture to run your business like a machine.',
    price: '$97',
    badge: 'Best Seller',
    badgeColor: 'rgba(0,229,255,0.8)',
  },
  {
    id: 'content-pipeline',
    icon: Cpu,
    category: 'Automation',
    title: 'Content Pipeline Pro',
    desc: 'End-to-end content automation system. Ideation → production → distribution → repurposing. Built in Make/Zapier. Works while you sleep.',
    price: '$147',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'brand-deal',
    icon: FileText,
    category: 'Templates',
    title: 'Brand Deal Negotiation Pack',
    desc: '12 proven email scripts and contract templates for brand partnerships. Stop leaving money on the table in negotiations.',
    price: '$49',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'revenue-dashboard',
    icon: TrendingUp,
    category: 'Analytics',
    title: 'Revenue Dashboard Kit',
    desc: 'Custom Google Sheets + Notion dashboard that consolidates your income streams, tracks growth, and surfaces opportunities.',
    price: '$67',
    badge: 'New',
    badgeColor: 'rgba(48,209,88,0.8)',
  },
  {
    id: 'social-assets',
    icon: Download,
    category: 'Assets',
    title: 'Social Media Asset Pack',
    desc: '200+ Canva templates designed for premium positioning. Covers YouTube, Instagram, LinkedIn, TikTok, and Twitter/X.',
    price: '$37',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'launch-sequence',
    icon: Zap,
    category: 'Systems',
    title: 'Launch Sequence Playbook',
    desc: 'Step-by-step digital product launch system. Email sequences, pre-launch content plan, and post-launch optimization framework.',
    price: '$89',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'ai-prompt-vault',
    icon: Sparkles,
    category: 'AI Tools',
    title: 'AI Prompt Vault for Creators',
    desc: '500+ battle-tested prompts organized by use case — content, email, ads, scripts, and strategy. Copy, paste, ship in seconds.',
    price: '$47',
    badge: 'Hot',
    badgeColor: 'rgba(167,139,250,0.9)',
  },
  {
    id: 'youtube-accelerator',
    icon: Play,
    category: 'Growth',
    title: 'YouTube Growth Accelerator',
    desc: 'Channel audit framework, click-worthy title formula, thumbnail psychology, the 48-hour algorithm window, and full SEO playbook.',
    price: '$97',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'email-list-builder',
    icon: Mail,
    category: 'Email',
    title: 'Email List Builder System',
    desc: '10 lead magnet blueprints, opt-in page copy framework, and a fully-written 14-day welcome sequence that turns subscribers into buyers.',
    price: '$79',
    badge: 'Best Seller',
    badgeColor: 'rgba(0,229,255,0.8)',
  },
  {
    id: 'viral-content-formula',
    icon: Flame,
    category: 'Content',
    title: 'Viral Content Formula',
    desc: 'The repeatable framework behind viral content. 90 hook templates across every platform, format breakdowns, and a repurposing matrix.',
    price: '$67',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'freelance-rate-kit',
    icon: DollarSign,
    category: 'Business',
    title: 'Freelance Rate Masterclass Kit',
    desc: 'Rate calculation worksheets, 15 client pitch scripts, negotiation playbook, scope creep prevention templates, and annual raise scripts.',
    price: '$57',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'personal-brand-kit',
    icon: User,
    category: 'Branding',
    title: 'Personal Brand Positioning Kit',
    desc: 'Niche clarity framework, unique value proposition builder, 20 bio templates per platform, and a complete content pillars architecture.',
    price: '$47',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'creator-legal-toolkit',
    icon: Shield,
    category: 'Legal',
    title: 'Creator Legal Toolkit',
    desc: '7 plug-and-play contract templates: influencer agreements, brand deals, collaborations, NDA, freelance contracts, and licensing rights.',
    price: '$89',
    badge: 'Essential',
    badgeColor: 'rgba(255,214,10,0.85)',
  },
  {
    id: 'passive-income-blueprint',
    icon: BarChart3,
    category: 'Strategy',
    title: 'Passive Income Blueprint',
    desc: '7 proven passive income streams for creators — each with a step-by-step implementation roadmap and income projection worksheet.',
    price: '$97',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'video-script-formula',
    icon: Video,
    category: 'Video',
    title: 'Video Script & Hook Formula',
    desc: '50 proven hook templates, the 4-part high-retention script structure, pattern interrupts, CTA formulas, and platform adaptation guides.',
    price: '$67',
    badge: null,
    badgeColor: '',
  },
  {
    id: 'course-creator-kit',
    icon: BookOpen,
    category: 'Courses',
    title: 'Digital Course Creator Kit',
    desc: 'Complete system to build and sell a $500+ course. Curriculum planner, full sales page copy template, and a 7-email launch sequence.',
    price: '$127',
    badge: 'Premium',
    badgeColor: 'rgba(255,214,10,0.85)',
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

function ProductCard({ product }: { product: Product }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const Icon = product.icon

  const handleBuy = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/product-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id }),
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
    <div
      className="glass-card rounded-2xl p-6 space-y-4 transition-all duration-300 hover:border-white/10 flex flex-col"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.12)' }}>
            <Icon className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-sub/50">
            {product.category}
          </span>
        </div>
        {product.badge && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{
              background: `${product.badgeColor}15`,
              color: product.badgeColor,
              border: `1px solid ${product.badgeColor}30`,
            }}>
            {product.badge}
          </span>
        )}
      </div>

      <div className="space-y-1.5 flex-1">
        <p className="font-bold text-brand-text">{product.title}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.45)' }}>
          {product.desc}
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-brand-border/30">
        <span className="text-xl font-black text-brand-text">{product.price}</span>
        <button
          onClick={handleBuy}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(0,229,255,0.1)',
            color: '#00E5FF',
            border: '1px solid rgba(0,229,255,0.2)',
          }}
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Redirecting…</>
          ) : (
            <>Get it <ArrowRight className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>
    </div>
  )
}

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
            {PRODUCTS.map(product => (
              <ProductCard key={product.id} product={product} />
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
              &ldquo;The Creator OS Bundle alone saved me 15 hours a week. The content pipeline runs itself.&rdquo;
            </p>
            <p className="text-sm text-brand-sub/50">— Jordan R., Full-time Creator</p>
          </div>
        </section>

      </main>
    </div>
  )
}
