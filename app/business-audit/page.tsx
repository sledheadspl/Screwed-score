import Link from 'next/link'
import {
  Receipt,
  Wifi,
  Trash2,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  CheckCircle,
  Clock,
  DollarSign,
} from 'lucide-react'
import type { Metadata } from 'next'
import LeadForm from './LeadForm'

export const metadata: Metadata = {
  title: 'Business Bill Audit — Find $3,000+/yr in Savings or Money Back | ScrewedScore',
  description:
    'We audit your business bills (credit card processing, telecom, waste, insurance) and find the overcharges. 48-hour turnaround. $497 flat. Money-back guarantee.',
  alternates: { canonical: 'https://www.screwedscore.com/business-audit' },
  openGraph: {
    title: 'Business Bill Audit — $3,000+/yr in savings or money back',
    description:
      'We audit 5 of your recurring bills and find the overcharges. 48 hours. $497 flat. Money-back guarantee.',
    url: 'https://www.screwedscore.com/business-audit',
    type: 'website',
  },
}

const BILLS_WE_AUDIT = [
  {
    icon: Receipt,
    color: '#4ade80',
    title: 'Credit card processing',
    body: 'Most independent restaurants overpay 0.5–2% on processing. On $1M revenue that\'s $5–20K/yr quietly leaking out.',
  },
  {
    icon: Wifi,
    color: '#00e5ff',
    title: 'Internet, phone, & telecom',
    body: 'Auto-renewals push contracted rates up 8–15% per year. Most owners never call back to renegotiate.',
  },
  {
    icon: Trash2,
    color: '#fbbf24',
    title: 'Waste hauling',
    body: 'Frequency upcharges and "container rental" fees that should have stopped years ago. We see this on 70% of statements.',
  },
  {
    icon: ShieldCheck,
    color: '#ff3b30',
    title: 'Business insurance',
    body: 'Coverage you don\'t need, deductibles too low, payroll classifications wrong. 1 in 3 policies has at least one fixable issue.',
  },
  {
    icon: Stethoscope,
    color: '#a78bfa',
    title: 'Software & SaaS',
    body: 'Old seats nobody uses, plan tiers you outgrew, duplicate tools across departments. The leak compounds monthly.',
  },
]

const STEPS = [
  {
    n: '1',
    title: 'You send us 5 bills',
    body: 'PDFs, photos, or screenshots. Last 3 months of any 5 recurring bills. Takes 5 minutes to gather.',
  },
  {
    n: '2',
    title: 'AI + human review (48 hrs)',
    body: 'Our AI flags every line item. A human cross-checks against industry benchmarks for your vertical.',
  },
  {
    n: '3',
    title: 'You get a report + scripts',
    body: 'PDF with the total $/yr leak, a per-bill breakdown, and exact phone scripts for each vendor call.',
  },
]

const FAQS = [
  {
    q: 'What if you don\'t find $1,500/yr?',
    a: 'Full refund. No questions, no negotiation. We only take the audit if we\'re confident the leak is bigger than the fee — that\'s what the free first look is for.',
  },
  {
    q: 'How is this different from a "free" audit from a vendor?',
    a: 'A "free audit" from a processor or insurance broker is a sales pitch — they\'re trying to switch you to their product. We\'re paid by you, work for you, and recommend the cheapest fix even if it means staying with your current vendor and just renegotiating.',
  },
  {
    q: 'Do you actually call my vendors and renegotiate?',
    a: 'The $497 audit gives you the report and the scripts. If you want us to handle the calls, that\'s a separate engagement: $497 + 25% of the first year\'s identified savings, only billed if we win.',
  },
  {
    q: 'How fast is "48 hours" really?',
    a: '48 hours from the moment you send us the bills. Most reports come back same-day or next-day. We start the AI scan immediately and the human review happens the same business day.',
  },
  {
    q: 'My business is tiny — is this worth it?',
    a: 'If your monthly bills total under $3,000/mo, probably not — the math doesn\'t favor you. Send us the free first look anyway and we\'ll tell you straight.',
  },
  {
    q: 'Do you work with dental / medical / contractors / [vertical]?',
    a: 'Yes. We started with restaurants because credit card processing wins are huge there, but the same bills exist in every SMB. The form has an industry picker — pick yours.',
  },
]

export default function BusinessAuditPage() {
  return (
    <div className="min-h-screen bg-brand-bg">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-brand-border bg-brand-bg/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="font-black text-base tracking-tight flex items-center gap-0">
            <span className="text-brand-text">Get</span>
            <span style={{ background: 'linear-gradient(135deg,#ff6b60,#ff3b30)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Screwed</span>
            <span className="text-brand-text">Score</span>
          </Link>
          <a
            href="#lead-form"
            className="text-xs font-black px-4 py-2 rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.1))', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}
          >
            Get my audit →
          </a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-5 py-16 space-y-20">

        {/* Hero */}
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}
          >
            <DollarSign className="w-3.5 h-3.5" /> For Small Businesses
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-brand-text leading-tight">
            Find $3,000+/yr in your business bills.<br />
            <span style={{ color: '#4ade80' }}>Or get your money back.</span>
          </h1>
          <p className="text-base text-brand-sub leading-relaxed">
            We audit 5 of your recurring bills — credit card processing, telecom, waste, insurance, software — and
            give you a report with every overcharge and exactly what to say to fix it. <strong className="text-brand-text">48 hours. $497 flat.</strong>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#lead-form"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-black transition-all"
              style={{ background: 'linear-gradient(135deg, #4ade80, #16a34a)', color: '#000' }}
            >
              <Sparkles className="w-5 h-5" /> Get my free first look
            </a>
          </div>
          <p className="text-xs text-brand-sub opacity-60">
            No payment until we&apos;ve shown you what&apos;s in your bills. Money-back guarantee on every audit.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: '$1,500+',  label: 'minimum savings or full refund' },
            { value: '48 hrs',   label: 'turnaround from upload to report' },
            { value: '$497',     label: 'flat — no per-bill fees, no markups' },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="rounded-2xl p-5 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-2xl font-black text-brand-text">{value}</p>
              <p className="text-xs text-brand-sub mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Bills we audit */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-brand-text text-center">What we audit</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {BILLS_WE_AUDIT.map(({ icon: Icon, color, title, body }) => (
              <div
                key={title}
                className="rounded-2xl p-6 space-y-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="font-black text-brand-text">{title}</h3>
                <p className="text-sm text-brand-sub leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-brand-text text-center">How it works</h2>
          <div className="space-y-4">
            {STEPS.map(({ n, title, body }) => (
              <div
                key={n}
                className="flex gap-5 rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                  style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
                >
                  {n}
                </div>
                <div>
                  <p className="font-black text-brand-text">{title}</p>
                  <p className="text-sm text-brand-sub mt-1">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust signal */}
        <div
          className="rounded-2xl p-8 space-y-4"
          style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5" style={{ color: '#4ade80' }} />
            <h2 className="text-lg font-black text-brand-text">Why we built this for small businesses</h2>
          </div>
          <p className="text-sm text-brand-sub leading-relaxed">
            Big companies have a CFO and a procurement team. They negotiate every contract, audit every renewal, and
            ruthlessly cut anything they don&apos;t need. Small business owners do everything themselves — payroll,
            inventory, HR, customer service. The bill stack just gets paid because there&apos;s no time to look.
          </p>
          <p className="text-sm text-brand-sub leading-relaxed">
            Same AI that consumers use to scan medical bills and contracts on ScrewedScore — pointed at the
            recurring bills your business is actually paying. We find the leaks. You keep the savings.
          </p>
        </div>

        {/* Lead form */}
        <LeadForm />

        {/* FAQ */}
        <div className="space-y-5">
          <h2 className="text-2xl font-black text-brand-text">Questions</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div
                key={q}
                className="rounded-2xl p-5 space-y-2"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="text-sm font-black text-brand-text">{q}</p>
                <p className="text-sm text-brand-sub leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div
          className="rounded-2xl p-12 text-center space-y-5"
          style={{ background: '#0d0f18', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <CheckCircle className="w-12 h-12 mx-auto" style={{ color: '#4ade80' }} />
          <h2 className="text-3xl font-black text-brand-text">Ready to see what&apos;s in your bills?</h2>
          <p className="text-sm text-brand-sub max-w-sm mx-auto">
            Free first look. Pay only if we&apos;ve found at least $1,500/yr in savings.
          </p>
          <a
            href="#lead-form"
            className="inline-block px-10 py-4 rounded-xl font-black text-base transition-all"
            style={{ background: 'linear-gradient(135deg, #4ade80, #16a34a)', color: '#000' }}
          >
            Get my free first look →
          </a>
        </div>

      </main>
    </div>
  )
}
