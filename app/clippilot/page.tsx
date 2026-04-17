import {
  ArrowRight, Zap, Radio, Scissors, Subtitles, Share2,
  CheckCircle, BarChart3, Monitor, Crown, Cpu, Clapperboard,
} from 'lucide-react'
import CheckoutButton from './CheckoutButton'

// ── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Radio,
    title: 'Live Stream Detection',
    desc: 'Connects to Twitch, YouTube Live, and Kick. Monitors audio spikes, chat velocity, subs, donations, and raids in real time.',
    tag: 'Detection',
  },
  {
    icon: Cpu,
    title: 'AI Moment Scoring',
    desc: 'Proprietary scoring engine weighs audio energy, chat hype, alert events, and keyword triggers. Only clips what actually matters.',
    tag: 'Intelligence',
  },
  {
    icon: Scissors,
    title: 'Smart Vertical Crop',
    desc: 'FFmpeg pipeline auto-crops 16:9 footage to 9:16 with face-aware centering. Pre-roll and post-roll settings put you in control.',
    tag: 'Processing',
  },
  {
    icon: Subtitles,
    title: 'On-Device AI Captions',
    desc: 'Whisper.cpp runs locally — no API key, no cost per clip. Word-level timestamps rendered as bold animated subtitles.',
    tag: 'Captions',
  },
  {
    icon: Share2,
    title: 'One-Click Publishing',
    desc: 'Queue clips to TikTok, YouTube Shorts, and Twitter/X with custom titles, descriptions, and hashtags per platform.',
    tag: 'Publishing',
  },
  {
    icon: BarChart3,
    title: 'Performance Analytics',
    desc: 'Track views, likes, and followers gained across platforms. See which moments actually converted and double down.',
    tag: 'Analytics',
  },
]

const HOW_IT_WORKS = [
  {
    n: '01',
    title: 'Connect Your Stream',
    desc: 'Paste a Twitch, YouTube, or Kick URL. ClipPilot handles the rest — no OBS plugin, no browser source needed.',
  },
  {
    n: '02',
    title: 'Stream Gets Monitored',
    desc: 'Audio levels, chat velocity, and alert events are analyzed every 100ms. A rolling 5-minute buffer keeps recent footage ready.',
  },
  {
    n: '03',
    title: 'Moments Auto-Detected',
    desc: 'When a score threshold is hit, ClipPilot captures the moment with your configured pre/post roll, crops it vertical, and adds captions.',
  },
  {
    n: '04',
    title: 'Publish Everywhere',
    desc: 'Review clips in the built-in library, edit titles and hashtags, then push to every platform in one click.',
  },
]

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    desc: 'Try ClipPilot risk-free.',
    features: [
      '10 clips per month',
      'ClipPilot watermark on clips',
      'Manual publish only',
      'All detection settings',
      'Local Whisper captions',
    ],
    cta: 'Download Free',
    productId: 'free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    desc: 'For active streamers.',
    features: [
      '100 clips per month',
      'No watermark',
      'Auto-publish to all platforms',
      'All caption styles & animations',
      'Priority clip processing',
    ],
    cta: 'Get Pro',
    productId: 'clippilot-pro',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Unlimited',
    price: '$49',
    period: '/mo',
    desc: 'For agencies & power users.',
    features: [
      'Unlimited clips',
      'White-label (remove branding)',
      'API access',
      'Priority support',
      'Early access to new features',
    ],
    cta: 'Go Unlimited',
    productId: 'clippilot-unlimited',
    highlight: false,
  },
]

const PLATFORMS = ['Twitch', 'YouTube Live', 'Kick', 'TikTok', 'YouTube Shorts', 'Twitter/X']

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ClipPilotPage() {
  return (
    <div className="min-h-screen bg-brand-bg overflow-x-hidden">

      {/* ── Atmospheric background ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140vw] h-[80vh]"
          style={{ background: 'radial-gradient(ellipse, rgba(0,229,255,0.05) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh]"
          style={{ background: 'radial-gradient(ellipse at bottom right, rgba(0,229,255,0.025) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100" />
        <div className="absolute inset-0 noise-bg" />
      </div>

      <main className="relative">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-5 sm:px-8 pt-20 pb-20 text-center">

          {/* Badge */}
          <p className="animate-fade-up text-[11px] font-bold uppercase tracking-[0.25em] mb-6"
            style={{ color: 'rgba(0,229,255,0.6)' }}>
            Digital Productions · ClipPilot
          </p>

          {/* Headline */}
          <div className="animate-fade-up delay-100 mb-6 max-w-5xl mx-auto">
            <h1 className="font-black tracking-tighter leading-[1.0]"
              style={{ fontSize: 'clamp(44px, 8.5vw, 96px)' }}>
              <span className="text-brand-text">Your stream clips itself.</span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #67e8f9 0%, #00E5FF 45%, #0088cc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 60px rgba(0,229,255,0.3))',
              }}>
                Posts itself. Blows up.
              </span>
            </h1>
          </div>

          {/* Sub */}
          <p className="animate-fade-up delay-200 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed mb-10"
            style={{ color: 'rgba(242,242,242,0.5)' }}>
            ClipPilot detects your best stream moments, crops them vertical,
            adds AI captions, and publishes to TikTok, YouTube Shorts &amp; Twitter — automatically.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up delay-300 flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <a
              href="https://github.com/sledheadspl/Screwed-score/releases/download/clippilot-v0.1.3/ClipPilot_0.1.3_x64-setup.exe"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #67e8f9, #00E5FF)',
                boxShadow: '0 0 40px rgba(0,229,255,0.3)',
              }}
            >
              <Monitor className="w-4 h-4" />
              Download for Windows — Free
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-brand-sub hover:text-brand-text border border-brand-border hover:bg-brand-muted transition-colors"
            >
              See How It Works <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Platform pills */}
          <div className="animate-fade-up delay-500 flex flex-wrap justify-center gap-2">
            {PLATFORMS.map(p => (
              <span
                key={p}
                className="text-xs px-3 py-1 rounded-full border"
                style={{
                  background: 'rgba(0,229,255,0.04)',
                  borderColor: 'rgba(0,229,255,0.12)',
                  color: 'rgba(242,242,242,0.45)',
                }}
              >
                {p}
              </span>
            ))}
          </div>

          {/* Stats row */}
          <div className="animate-fade-up delay-700 flex flex-wrap items-center justify-center gap-8 mt-14 text-center">
            {[
              { n: '~10MB', label: 'App size (.exe)' },
              { n: '100ms', label: 'Detection interval' },
              { n: '100%', label: 'Local AI — no cloud' },
              { n: '3', label: 'Publish platforms' },
            ].map(({ n, label }) => (
              <div key={label}>
                <p className="text-2xl font-black text-brand-text" style={{ color: '#00E5FF' }}>{n}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(242,242,242,0.35)' }}>{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section id="features" className="max-w-6xl mx-auto px-5 sm:px-8 pb-28">
          <div className="text-center space-y-3 mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
              style={{ color: 'rgba(0,229,255,0.5)' }}>
              What ClipPilot does
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
              The full clip pipeline, automated.
            </h2>
            <p className="max-w-lg mx-auto text-sm leading-relaxed"
              style={{ color: 'rgba(242,242,242,0.45)' }}>
              From stream to viral short — every step handled by the app,
              running locally on your machine.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, tag }) => (
              <div
                key={title}
                className="glass-card rounded-2xl p-6 space-y-4 transition-all duration-300 hover:border-cyan-500/20 group"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                    style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }}
                  >
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{
                      background: 'rgba(0,229,255,0.07)',
                      color: 'rgba(0,229,255,0.65)',
                      border: '1px solid rgba(0,229,255,0.1)',
                    }}
                  >
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

        {/* ── How It Works ──────────────────────────────────────────────── */}
        <section id="how-it-works" className="border-t border-brand-border/30 py-28 px-5 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center space-y-3 mb-16">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
                style={{ color: 'rgba(0,229,255,0.5)' }}>
                How it works
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
                Set it and stream.
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {HOW_IT_WORKS.map(({ n, title, desc }) => (
                <div
                  key={n}
                  className="glass-card rounded-2xl p-7 flex gap-5 transition-all duration-300 hover:border-cyan-500/15"
                >
                  <span
                    className="text-3xl font-black tabular-nums shrink-0 leading-none mt-0.5"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,229,255,0.06))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 12px rgba(0,229,255,0.25))',
                    }}
                  >
                    {n}
                  </span>
                  <div className="space-y-1.5">
                    <p className="font-bold text-brand-text text-base">{title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(242,242,242,0.5)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Detection Algorithm ───────────────────────────────────────── */}
        <section className="py-24 px-5 sm:px-8 border-t border-brand-border/30">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
                  style={{ color: 'rgba(0,229,255,0.5)' }}>
                  The moment engine
                </p>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight leading-tight">
                  Not every loud moment<br />
                  <span style={{
                    background: 'linear-gradient(135deg, #67e8f9, #00E5FF)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    is the right one.
                  </span>
                </h2>
                <p className="text-brand-sub/60 leading-relaxed">
                  ClipPilot combines four signals — audio energy, chat velocity,
                  alert events, and keyword hits — into a single score. Only moments
                  that cross your threshold get clipped.
                </p>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Audio spike', detail: 'RMS level > 2× rolling average' },
                    { label: 'Chat surge', detail: 'Messages/sec > 3× baseline' },
                    { label: 'Alert events', detail: 'Sub +20 · Dono +30 · Raid +50' },
                    { label: 'Keywords', detail: 'Custom words with custom point values' },
                  ].map(({ label, detail }) => (
                    <div key={label} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                      <span>
                        <span className="text-brand-text font-medium">{label}</span>
                        <span style={{ color: 'rgba(242,242,242,0.4)' }}> — {detail}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score formula card */}
              <div
                className="glass-card rounded-2xl p-6 animate-border-cyan"
                style={{ border: '1px solid rgba(0,229,255,0.15)' }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(0,229,255,0.5)' }}>
                  Moment Score Formula
                </p>
                <pre
                  className="text-xs leading-relaxed overflow-x-auto"
                  style={{ color: 'rgba(0,229,255,0.8)', fontFamily: 'monospace' }}
                >
{`score =
  audio_spike × audio_weight   // 0–100
+ chat_surge  × chat_weight    // 1–10×
+ alert_points                 // +20/+30/+50
+ keyword_points               // custom

if score ≥ threshold (default 50):
  clip(timestamp - pre_roll,
       timestamp + post_roll)`}
                </pre>
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p style={{ color: 'rgba(242,242,242,0.35)' }}>Detection interval</p>
                    <p className="font-bold text-brand-text mt-0.5">100ms</p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(242,242,242,0.35)' }}>Rolling buffer</p>
                    <p className="font-bold text-brand-text mt-0.5">5 minutes</p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(242,242,242,0.35)' }}>Min cooldown</p>
                    <p className="font-bold text-brand-text mt-0.5">Configurable</p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(242,242,242,0.35)' }}>Max clip length</p>
                    <p className="font-bold text-brand-text mt-0.5">15 / 30 / 60 / 90s</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <section id="pricing" className="border-t border-brand-border/30 py-28 px-5 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center space-y-3 mb-14">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
                style={{ color: 'rgba(0,229,255,0.5)' }}>
                Pricing
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
                Start free. Scale when you pop off.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {TIERS.map(({ name, price, period, desc, features, cta, productId, highlight, badge }) => (
                <div
                  key={name}
                  className={`glass-card rounded-2xl p-7 flex flex-col gap-6 transition-all duration-300 ${
                    highlight ? 'animate-border-cyan' : 'hover:border-white/10'
                  }`}
                  style={highlight ? {
                    background: 'rgba(0,229,255,0.04)',
                    border: '1px solid rgba(0,229,255,0.2)',
                    boxShadow: '0 0 60px rgba(0,229,255,0.06)',
                  } : {}}
                >
                  {/* Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: highlight ? '#00E5FF' : 'rgba(242,242,242,0.4)' }}>
                        {name}
                      </span>
                      {badge && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{
                            background: 'rgba(0,229,255,0.1)',
                            color: '#00E5FF',
                            border: '1px solid rgba(0,229,255,0.2)',
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-4xl font-black text-brand-text">{price}</span>
                      {period && <span className="text-sm" style={{ color: 'rgba(242,242,242,0.4)' }}>{period}</span>}
                    </div>
                    <p className="text-xs mt-1.5" style={{ color: 'rgba(242,242,242,0.4)' }}>{desc}</p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 flex-1">
                    {features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle
                          className="w-4 h-4 mt-0.5 shrink-0"
                          style={{ color: highlight ? '#00E5FF' : 'rgba(242,242,242,0.3)' }}
                        />
                        <span style={{ color: 'rgba(242,242,242,0.65)' }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <CheckoutButton productId={productId} label={cta} highlight={highlight} />
                </div>
              ))}
            </div>

            <p className="text-center mt-6 text-xs" style={{ color: 'rgba(242,242,242,0.25)' }}>
              Annual billing available: Pro $149/yr · Unlimited $399/yr · License keys activate in-app.
            </p>
          </div>
        </section>

        {/* ── Tech Stack ────────────────────────────────────────────────── */}
        <section className="border-t border-brand-border/30 py-24 px-5 sm:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
                style={{ color: 'rgba(0,229,255,0.5)' }}>
                Built different
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight">
                Native app. No subscription to a cloud.
              </h2>
              <p className="max-w-lg mx-auto text-sm" style={{ color: 'rgba(242,242,242,0.45)' }}>
                ClipPilot is a ~10MB Windows .exe. FFmpeg and Whisper run on your machine.
                Your clips never leave your drive unless you publish them.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { tech: 'Tauri 2.0', desc: 'Rust + WebView2, tiny binary' },
                { tech: 'FFmpeg', desc: 'Bundled, offline video processing' },
                { tech: 'Whisper.cpp', desc: 'On-device speech → captions' },
                { tech: 'SQLite', desc: 'Local database, no setup' },
              ].map(({ tech, desc }) => (
                <div
                  key={tech}
                  className="glass-card rounded-xl p-4 text-center space-y-1"
                >
                  <p className="text-sm font-bold text-brand-text">{tech}</p>
                  <p className="text-xs" style={{ color: 'rgba(242,242,242,0.4)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Download CTA ─────────────────────────────────────────────── */}
        <section id="download" className="py-28 px-5 sm:px-8 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,229,255,0.06))',
                border: '1px solid rgba(0,229,255,0.2)',
              }}
            >
              <Clapperboard className="w-7 h-7 text-cyan-400" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
              Ready to start clipping?
            </h2>
            <p className="text-brand-sub/60 text-lg">
              Download ClipPilot free. No account required.
              Works on Windows 10/11.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://github.com/sledheadspl/Screwed-score/releases/download/clippilot-v0.1.3/ClipPilot_0.1.3_x64-setup.exe"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #67e8f9, #00E5FF)',
                  boxShadow: '0 0 60px rgba(0,229,255,0.25)',
                }}
              >
                <Monitor className="w-4 h-4" />
                Download for Windows (.exe)
              </a>
              <a
                href="mailto:hello@rembydesign.com?subject=ClipPilot%20Inquiry"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-brand-sub hover:text-brand-text border border-brand-border hover:bg-brand-muted transition-colors"
              >
                Questions? Contact us
              </a>
            </div>

            <p className="text-xs" style={{ color: 'rgba(242,242,242,0.2)' }}>
              Requires Windows 10 version 1803+ with WebView2 Runtime (ships with Windows 10/11).
              macOS &amp; Linux builds coming soon.
            </p>
          </div>
        </section>

      </main>
    </div>
  )
}
