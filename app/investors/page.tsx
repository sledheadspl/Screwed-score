'use client'

import { useState } from 'react'
import {
  ArrowRight, TrendingUp, DollarSign, Users, Zap, Shield,
  BarChart3, Globe, Cpu, Video, ChevronDown, Mail, CheckCircle,
  Target, Layers, Rocket,
} from 'lucide-react'

// ── Data ─────────────────────────────────────────────────────────────────────

const VERTICALS = [
  {
    icon: Shield,
    color: '#ff3b30',
    colorAlpha: 'rgba(255,59,48,0.08)',
    colorBorder: 'rgba(255,59,48,0.15)',
    name: 'GetScrewedScore',
    tag: 'Web SaaS · Consumer Protection',
    headline: 'AI that detects if you\'re being overcharged — on any bill, invoice, or contract.',
    desc: 'Upload a mechanic invoice, medical bill, lease, or contractor estimate. The AI returns a SCREWED / MAYBE / SAFE verdict in 20 seconds with exact dollar amounts at risk and what to do about it.',
    model: '3 free scans → $2.99/scan · B2C',
    market: 'Every consumer who receives a bill. ~260M adults in the US alone.',
    why: 'The average American overpays by $1,300/year on services they could negotiate. Nobody has built the consumer-side tool.',
  },
  {
    icon: Video,
    color: '#00E5FF',
    colorAlpha: 'rgba(0,229,255,0.06)',
    colorBorder: 'rgba(0,229,255,0.15)',
    name: 'ClipPilot',
    tag: 'Desktop App · Creator Tools',
    headline: 'AI that turns live streams into viral short-form clips — fully automated.',
    desc: 'Monitors any Twitch, YouTube Live, or Kick stream in real time. When a high-scoring moment is detected, it clips, crops to 9:16, adds AI captions, and publishes to TikTok, YouTube Shorts, and Twitter/X — automatically.',
    model: 'Free → $19/mo Pro → $49/mo Unlimited · SaaS subscription',
    market: '8M+ active streamers. $6.8B creator economy software market.',
    why: 'Content clipping is 3-5 hrs of work per stream. Every streamer needs it. Nobody has a fully automated desktop solution that works offline.',
  },
]

const METRICS = [
  { label: 'Products live', value: '2', sub: 'GetScrewedScore + ClipPilot' },
  { label: 'Document types analyzed', value: '12+', sub: 'Bills, contracts, invoices' },
  { label: 'ClipPilot platforms', value: '3 → 3', sub: 'Input streams → Output platforms' },
  { label: 'Stage', value: 'Pre-seed', sub: 'Bootstrapped, revenue-generating' },
]

const REVENUE_STREAMS = [
  { name: 'GetScrewedScore scans', model: '$2.99 per scan after 3 free', type: 'Transactional' },
  { name: 'ClipPilot Pro', model: '$19/mo — no clip watermark, auto-publish', type: 'Subscription' },
  { name: 'ClipPilot Unlimited', model: '$49/mo — unlimited clips, API, white-label', type: 'Subscription' },
  { name: 'Annual plans', model: 'Pro $149/yr · Unlimited $399/yr', type: 'Subscription' },
  { name: 'Digital products', model: 'Creator OS, templates, automation packs', type: 'One-time' },
]

const USE_OF_FUNDS = [
  { pct: '40%', label: 'Paid acquisition', desc: 'Google/TikTok ads targeting mechanic invoice searches and streamers' },
  { pct: '25%', label: 'Product development', desc: 'Mobile app for GetScrewedScore · Mac/Linux ClipPilot · API platform' },
  { pct: '20%', label: 'Contractor/team', desc: 'First hire: growth marketer. Second: customer support' },
  { pct: '15%', label: 'Infrastructure & ops', desc: 'Supabase scale, CDN, AI model costs at volume' },
]

const FAQS = [
  {
    q: 'What equity stake are you offering?',
    a: 'Flexible — we\'re open to discussing the right structure based on investment size and what you bring beyond capital. Starting conversations at 5–20% for early-stage checks.',
  },
  {
    q: 'What\'s the minimum investment?',
    a: 'No hard minimum. We\'re open to multiple smaller checks from strategic angels who bring distribution, networks, or domain expertise alongside capital.',
  },
  {
    q: 'Is there a pitch deck?',
    a: 'Yes — email us and we\'ll send the full deck, financial projections, and product demo links within 24 hours.',
  },
  {
    q: 'Are you incorporated?',
    a: 'Operating as REMbyDesign LLC. Open to converting to a C-Corp for institutional investment.',
  },
  {
    q: 'What\'s the exit strategy?',
    a: 'Two realistic paths: (1) Acquisition by a consumer protection, fintech, or creator tools company at scale. (2) Series A → growth. GetScrewedScore has direct acquisition interest potential from insurance, legal, and financial services.',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function InvestorsPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-[#080808] overflow-x-hidden">

      {/* Atmospheric BG */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[70vh]"
          style={{ background: 'radial-gradient(ellipse, rgba(255,59,48,0.04) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh]"
          style={{ background: 'radial-gradient(ellipse at bottom right, rgba(0,229,255,0.025) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 noise-bg opacity-50" />
      </div>

      <main className="relative max-w-5xl mx-auto px-5 sm:px-8 pb-32">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="pt-24 pb-20 text-center">

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-8 text-xs font-bold uppercase tracking-widest"
            style={{ borderColor: 'rgba(255,59,48,0.2)', background: 'rgba(255,59,48,0.06)', color: 'rgba(255,59,48,0.8)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Investor Overview — REMbyDesign
          </div>

          <h1
            className="font-black tracking-tighter leading-[1.0] mb-6 mx-auto"
            style={{ fontSize: 'clamp(38px, 7vw, 82px)', maxWidth: '900px' }}
          >
            <span style={{ color: '#f2f2f2' }}>Two products.</span>
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ff3b30 50%, #ff8a65 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              One mission.
            </span>
            <br />
            <span style={{ color: '#f2f2f2' }}>A chance to get in early.</span>
          </h1>

          <p className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ color: 'rgba(242,242,242,0.5)' }}>
            We're building the consumer protection layer for the internet
            and the AI content stack for creators.
            Both products are live, both are monetizing.
            We're raising to accelerate.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:SledheadsPL@gmail.com?subject=ClipPilot%20%2F%20GetScrewedScore%20—%20Investor%20Inquiry&body=Hi%20Ryan%2C%0A%0AI'm%20interested%20in%20learning%20more%20about%20an%20investment%20in%20REMbyDesign.%0A%0APlease%20send%20me%20the%20pitch%20deck%20and%20let's%20find%20a%20time%20to%20talk.%0A%0A"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #ff6b6b, #ff3b30)',
                boxShadow: '0 0 40px rgba(255,59,48,0.3)',
              }}
            >
              <Mail className="w-4 h-4" />
              Request the Pitch Deck
            </a>
            <a
              href="#the-ask"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-colors"
              style={{ border: '1px solid rgba(242,242,242,0.1)', color: 'rgba(242,242,242,0.5)' }}
            >
              See the ask <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-20">
          {METRICS.map(({ label, value, sub }) => (
            <div key={label} className="rounded-2xl p-5 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-3xl font-black mb-1"
                style={{
                  background: 'linear-gradient(135deg, #ff6b6b, #ff3b30)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >{value}</p>
              <p className="text-xs font-semibold text-[#f2f2f2] mb-0.5">{label}</p>
              <p className="text-[11px]" style={{ color: 'rgba(242,242,242,0.35)' }}>{sub}</p>
            </div>
          ))}
        </section>

        {/* ── The Opportunity ─────────────────────────────────────────────── */}
        <section className="mb-24">
          <div className="text-center mb-12 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: 'rgba(255,59,48,0.6)' }}>The Business</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#f2f2f2] tracking-tight">
              Two live products. Two massive markets.
            </h2>
          </div>

          <div className="space-y-5">
            {VERTICALS.map(({ icon: Icon, color, colorAlpha, colorBorder, name, tag, headline, desc, model, market, why }) => (
              <div key={name} className="rounded-2xl p-7 sm:p-8"
                style={{ background: colorAlpha, border: `1px solid ${colorBorder}` }}>
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `rgba(${color === '#ff3b30' ? '255,59,48' : '0,229,255'},0.1)`, border: `1px solid ${colorBorder}` }}>
                      <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-xl font-black" style={{ color: '#f2f2f2' }}>{name}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ background: `rgba(${color === '#ff3b30' ? '255,59,48' : '0,229,255'},0.1)`, color, border: `1px solid ${colorBorder}` }}>
                          {tag}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-[#f2f2f2] leading-snug">{headline}</p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.55)' }}>{desc}</p>
                    <div className="grid sm:grid-cols-3 gap-3 text-xs">
                      {[
                        { icon: DollarSign, label: 'Revenue model', val: model },
                        { icon: Users, label: 'Target market', val: market },
                        { icon: Target, label: 'The gap', val: why },
                      ].map(({ icon: I, label, val }) => (
                        <div key={label} className="rounded-xl p-3 space-y-1"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <I className="w-3 h-3" style={{ color }} />
                            <p className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'rgba(242,242,242,0.4)' }}>{label}</p>
                          </div>
                          <p style={{ color: 'rgba(242,242,242,0.7)' }}>{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Market Size ─────────────────────────────────────────────────── */}
        <section className="mb-24">
          <div className="text-center mb-12 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: 'rgba(255,59,48,0.6)' }}>Market Size</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#f2f2f2] tracking-tight">
              Big problems. Bigger markets.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="rounded-2xl p-7 space-y-4"
              style={{ background: 'rgba(255,59,48,0.04)', border: '1px solid rgba(255,59,48,0.12)' }}>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-red-400" />
                <p className="font-bold text-[#f2f2f2]">Consumer Protection</p>
              </div>
              <div className="space-y-3 text-sm" style={{ color: 'rgba(242,242,242,0.55)' }}>
                <div className="flex justify-between items-baseline">
                  <span>TAM — US adults who receive bills</span>
                  <span className="font-bold text-[#f2f2f2]">260M+</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span>Overcharged Americans per year</span>
                  <span className="font-bold text-[#f2f2f2]">~80M</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span>Avg overcharge (mechanic, medical)</span>
                  <span className="font-bold text-[#f2f2f2]">$400–$1,300</span>
                </div>
                <div className="flex justify-between items-baseline border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span>Consumer legal tech market (2024)</span>
                  <span className="font-bold text-red-400">$12.4B</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-7 space-y-4"
              style={{ background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.1)' }}>
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-cyan-400" />
                <p className="font-bold text-[#f2f2f2]">Creator Tools</p>
              </div>
              <div className="space-y-3 text-sm" style={{ color: 'rgba(242,242,242,0.55)' }}>
                <div className="flex justify-between items-baseline">
                  <span>Active streamers worldwide</span>
                  <span className="font-bold text-[#f2f2f2]">8M+</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span>Short-form video creators</span>
                  <span className="font-bold text-[#f2f2f2]">200M+</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span>Hours spent clipping per stream</span>
                  <span className="font-bold text-[#f2f2f2]">3–5 hrs</span>
                </div>
                <div className="flex justify-between items-baseline border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span>Creator economy tools market</span>
                  <span className="font-bold text-cyan-400">$6.8B</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Revenue Model ───────────────────────────────────────────────── */}
        <section className="mb-24">
          <div className="text-center mb-12 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: 'rgba(255,59,48,0.6)' }}>Revenue</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#f2f2f2] tracking-tight">
              Multiple monetization streams.
            </h2>
          </div>

          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {REVENUE_STREAMS.map((r, i) => (
              <div key={r.name}
                className="flex items-center justify-between gap-4 px-6 py-4 text-sm"
                style={{ borderBottom: i < REVENUE_STREAMS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined, background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <div>
                  <p className="font-semibold text-[#f2f2f2]">{r.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(242,242,242,0.4)' }}>{r.model}</p>
                </div>
                <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(255,59,48,0.08)', color: 'rgba(255,100,80,0.9)', border: '1px solid rgba(255,59,48,0.15)' }}>
                  {r.type}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl p-5 flex items-start gap-4"
            style={{ background: 'rgba(255,214,10,0.04)', border: '1px solid rgba(255,214,10,0.12)' }}>
            <Zap className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-sm" style={{ color: 'rgba(242,242,242,0.55)' }}>
              <span className="text-[#f2f2f2] font-semibold">Unit economics are strong.</span>{' '}
              GetScrewedScore has near-zero marginal cost per scan at scale (AI API + storage).
              ClipPilot processes everything locally on the user's machine — our infrastructure costs don't scale with usage.
            </p>
          </div>
        </section>

        {/* ── Why Now ─────────────────────────────────────────────────────── */}
        <section className="mb-24">
          <div className="text-center mb-12 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: 'rgba(255,59,48,0.6)' }}>Why Now</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#f2f2f2] tracking-tight">
              The timing is right.
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Cpu,
                title: 'AI got cheap enough',
                body: 'GPT-4o vision + Whisper.cpp make it economically viable to analyze any document and transcribe any audio for pennies. 18 months ago this was too expensive to build as a consumer product.',
              },
              {
                icon: Globe,
                title: 'Short-form is everything',
                body: 'TikTok, YouTube Shorts, and Instagram Reels now drive more discovery than any other channel. Streamers who don\'t clip are invisible. The demand for automation is at an all-time high.',
              },
              {
                icon: TrendingUp,
                title: 'Consumer trust is collapsing',
                body: 'Post-COVID price gouging, junk fees, and algorithmic pricing have created a generation of suspicious consumers. They\'re actively searching for tools to verify what they\'re being charged.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl p-6 space-y-3"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.15)' }}>
                  <Icon className="w-4 h-4 text-red-400" />
                </div>
                <p className="font-bold text-[#f2f2f2] text-sm">{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(242,242,242,0.5)' }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The Ask ─────────────────────────────────────────────────────── */}
        <section id="the-ask" className="mb-24">
          <div className="text-center mb-12 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: 'rgba(255,59,48,0.6)' }}>The Ask</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#f2f2f2] tracking-tight">
              What we're looking for.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mb-8">
            <div className="rounded-2xl p-7 space-y-4"
              style={{ background: 'rgba(255,59,48,0.05)', border: '1px solid rgba(255,59,48,0.15)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,59,48,0.6)' }}>Equity Offered</p>
              <p className="text-5xl font-black text-[#f2f2f2]">5–20%</p>
              <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)' }}>
                Depending on check size, strategic value, and what you bring beyond capital.
                First-mover advantage available. Structure is negotiable.
              </p>
            </div>

            <div className="rounded-2xl p-7 space-y-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(242,242,242,0.4)' }}>Ideal Partner Brings</p>
              <ul className="space-y-2">
                {[
                  'Distribution — audience, network, or media reach',
                  'Capital — seed check ($10K–$250K range)',
                  'Domain expertise — fintech, legaltech, or creator economy',
                  'Operator experience — scaling B2C consumer products',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <span style={{ color: 'rgba(242,242,242,0.6)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Use of funds */}
          <div className="rounded-2xl p-7"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm font-bold text-[#f2f2f2] mb-5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-400" />
              How the capital gets deployed
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {USE_OF_FUNDS.map(({ pct, label, desc }) => (
                <div key={label} className="flex gap-4">
                  <span className="text-2xl font-black shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #ff6b6b, #ff3b30)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                    {pct}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#f2f2f2]">{label}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(242,242,242,0.45)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section className="mb-24">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#f2f2f2] tracking-tight">
              Common questions.
            </h2>
          </div>

          <div className="space-y-2">
            {FAQS.map(({ q, a }, i) => (
              <div key={i} className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  className="w-full text-left flex items-center justify-between gap-4 p-5"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-[#f2f2f2] text-sm sm:text-base">{q}</span>
                  <ChevronDown
                    className="w-4 h-4 shrink-0 transition-transform"
                    style={{
                      color: 'rgba(255,59,48,0.6)',
                      transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm leading-relaxed"
                    style={{ color: 'rgba(242,242,242,0.55)' }}>
                    {a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <section className="text-center">
          <div className="rounded-3xl p-10 sm:p-14 relative overflow-hidden"
            style={{ background: 'rgba(255,59,48,0.05)', border: '1px solid rgba(255,59,48,0.15)' }}>
            <div className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at center top, rgba(255,59,48,0.08) 0%, transparent 70%)' }} />

            <div className="relative">
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                style={{ background: 'rgba(255,59,48,0.1)', color: 'rgba(255,100,80,0.9)', border: '1px solid rgba(255,59,48,0.2)' }}>
                <Rocket className="w-3 h-3" />
                Let's talk
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-[#f2f2f2] tracking-tight mb-4">
                Ready to get in before this blows up?
              </h2>
              <p className="text-lg max-w-lg mx-auto mb-8" style={{ color: 'rgba(242,242,242,0.5)' }}>
                Send an email and we'll get back within 24 hours with the full deck,
                demo access, and everything you need to make a decision.
              </p>

              <a
                href="mailto:SledheadsPL@gmail.com?subject=Investor%20Inquiry%20—%20REMbyDesign%20(GetScrewedScore%20%2F%20ClipPilot)&body=Hi%20Ryan%2C%0A%0AI'm%20interested%20in%20learning%20more%20about%20an%20investment%20opportunity%20in%20REMbyDesign.%0A%0APlease%20send%20me%20the%20full%20pitch%20deck.%0A%0A%5BYour%20name%20and%20brief%20background%5D%0A"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #ff6b6b, #ff3b30)',
                  boxShadow: '0 0 60px rgba(255,59,48,0.3)',
                }}
              >
                <Mail className="w-5 h-5" />
                SledheadsPL@gmail.com
              </a>

              <p className="text-xs mt-5" style={{ color: 'rgba(242,242,242,0.25)' }}>
                Or visit <a href="https://screwedscore.com" className="underline underline-offset-2 hover:text-white/60 transition-colors">screwedscore.com</a> and{' '}
                <a href="https://screwedscore.com/clippilot" className="underline underline-offset-2 hover:text-white/60 transition-colors">screwedscore.com/clippilot</a>{' '}
                to see both products live before reaching out.
              </p>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
