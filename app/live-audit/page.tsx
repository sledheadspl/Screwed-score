import type { Metadata } from 'next'
import { Receipt, Stethoscope, Wifi, CreditCard, Repeat, Wrench, Home, FileText, ClipboardList, PhoneCall, Handshake } from 'lucide-react'
import { BookingForm } from './BookingForm'
import { LIVE_AUDIT_AREA, LIVE_AUDIT_AUDITOR, LIVE_AUDIT_OPTIONS, formatPrice } from '@/lib/live-audit'

const FROM = formatPrice(Math.min(...Object.values(LIVE_AUDIT_OPTIONS).map(o => o.priceCents)))

export const metadata: Metadata = {
  title: `Bill & Finance Audit in Spokane, WA: In Person or by Video, from ${FROM}`,
  description: `Sit down with a real person, in person around ${LIVE_AUDIT_AREA} or by video anywhere, and go through your bills, statements and contracts line by line. Leave knowing exactly what to dispute, cancel or renegotiate.`,
  alternates: { canonical: 'https://www.screwedscore.com/live-audit' },
  openGraph: {
    title: `Live audit with a real person, from ${FROM}`,
    description: 'Your bills, statements and contracts reviewed line by line, face to face or by video.',
    url: 'https://www.screwedscore.com/live-audit',
    type: 'website',
  },
}

const WHAT_WE_REVIEW = [
  { icon: Stethoscope, title: 'Medical & dental bills',      body: 'Duplicate charges, coding errors, and bills insurance should have covered.' },
  { icon: Wifi,        title: 'Phone, internet & TV',        body: 'Promo rates that quietly expired, equipment fees, and plans you outgrew.' },
  { icon: CreditCard,  title: 'Bank & credit card fees',     body: 'Overdraft, maintenance and interest charges you can often get reversed.' },
  { icon: Repeat,      title: 'Subscriptions',               body: 'Forgotten trials, duplicate services and annual renewals nobody uses.' },
  { icon: Wrench,      title: 'Auto repair & contractors',   body: 'Estimates and invoices checked for padded labor and unnecessary work.' },
  { icon: Home,        title: 'Leases, insurance & contracts', body: 'Clauses, auto-renewals and coverage worth questioning before you sign or renew.' },
]

const STEPS = [
  { icon: ClipboardList, title: 'Book and pay',          body: 'Pick video or in person and tell us what you want looked at.' },
  { icon: PhoneCall,     title: 'We confirm a time',     body: `${LIVE_AUDIT_AUDITOR} contacts you within 24 hours to set a time that suits you.` },
  { icon: Handshake,     title: 'Go through it together', body: 'Line by line, in plain English. You leave with a written list of what to dispute, cancel or renegotiate, and how.' },
]

const FAQ = [
  { q: 'What should I bring?', a: 'Whatever is bugging you: recent bills, bank and credit card statements, insurance paperwork, subscriptions, contracts or repair estimates. Paper, PDFs and phone screenshots all work.' },
  { q: 'How is this different from the free AI scan?', a: 'The AI scan checks one document in seconds. A live audit is a real person looking across all your bills and statements with you, answering questions, and helping you decide what to do and how to say it.' },
  { q: 'Where do in-person audits happen?', a: `Around ${LIVE_AUDIT_AREA}: at your home, your office, or a coffee shop, whichever you prefer. Outside that area, choose a video call.` },
  { q: 'What if I need to reschedule?', a: 'Reply to your confirmation email or tell us when we call, and we will find another time.' },
]

const SITE = 'https://www.screwedscore.com'

// Structured data: a local service-area business (no street address shown),
// its two priced offers, and the FAQ. Keep in sync with what the page says.
const JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE}/live-audit#service`,
    name: 'ScrewedScore Live Bill & Finance Audit',
    url: `${SITE}/live-audit`,
    image: `${SITE}/og`,
    description: `A real person reviews your bills, bank and credit card statements, subscriptions and contracts with you, in person around ${LIVE_AUDIT_AREA} or by video, and shows you what to dispute, cancel or renegotiate.`,
    areaServed: [
      { '@type': 'City', name: 'Spokane', containedInPlace: { '@type': 'State', name: 'Washington' } },
      { '@type': 'City', name: 'Spokane Valley', containedInPlace: { '@type': 'State', name: 'Washington' } },
      { '@type': 'Country', name: 'United States' },
    ],
    priceRange: Object.values(LIVE_AUDIT_OPTIONS).map(o => formatPrice(o.priceCents)).join('–'),
    founder: { '@type': 'Person', name: LIVE_AUDIT_AUDITOR },
    makesOffer: Object.values(LIVE_AUDIT_OPTIONS).map(o => ({
      '@type': 'Offer',
      name: `Live audit: ${o.label} (${o.minutes} minutes)`,
      price: (o.priceCents / 100).toFixed(2),
      priceCurrency: 'USD',
      url: `${SITE}/live-audit#book`,
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
]

export default function LiveAuditPage() {
  return (
    <main className="min-h-screen bg-brand-bg overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-28 sm:pt-32 pb-16">
        <div className="absolute inset-x-0 top-0 h-[480px] pointer-events-none -z-0"
          style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(255,59,48,0.14) 0%, transparent 70%)' }} />
        <div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-12 items-start">
          <div className="space-y-6 lg:pt-6">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-red-400 border border-red-500/30 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Real person · Live
            </span>
            <h1 className="font-display font-black tracking-tighter text-brand-text leading-[0.95]"
              style={{ fontSize: 'clamp(40px, 6.5vw, 72px)' }}>
              Have a real person<br />
              <span style={{ background: 'linear-gradient(135deg, #ff9080, #ff3b30)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                audit your bills.
              </span>
            </h1>
            <p className="text-lg text-brand-text/85 leading-relaxed max-w-xl">
              Sit down with {LIVE_AUDIT_AUDITOR}, in person around {LIVE_AUDIT_AREA} or by video anywhere,
              and go through your bills, statements and contracts line by line.
            </p>
            <p className="text-base text-brand-sub leading-relaxed max-w-xl">
              You leave knowing exactly what to dispute, what to cancel, and what to renegotiate, with the words to do it.
            </p>
            <ul className="space-y-2 text-sm text-brand-text/80">
              {Object.values(LIVE_AUDIT_OPTIONS).map(o => (
                <li key={o.label} className="flex items-baseline gap-2">
                  <span className="font-black text-brand-text">{formatPrice(o.priceCents)}</span>
                  <span>{o.label}, {o.minutes} minutes</span>
                </li>
              ))}
            </ul>
          </div>

          <div id="book" className="rounded-3xl border border-brand-border bg-brand-surface p-6 sm:p-8 scroll-mt-24"
            style={{ boxShadow: '0 0 80px rgba(255,59,48,0.08), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
            <h2 className="text-xl font-black text-brand-text mb-1">Book your live audit</h2>
            <p className="text-sm text-brand-sub mb-6">Takes a minute. Pay securely, then we set the time together.</p>
            <BookingForm />
          </div>
        </div>
      </section>

      {/* What we review */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16 space-y-10">
        <div className="text-center space-y-2">
          <p className="text-[11px] font-bold text-brand-sub/55 uppercase tracking-[0.25em]">What we go through</p>
          <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">Anything with your money on it.</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WHAT_WE_REVIEW.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-2">
              <Icon className="w-5 h-5 text-red-400" />
              <p className="font-bold text-brand-text">{title}</p>
              <p className="text-sm text-brand-sub leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16 space-y-10">
        <div className="text-center space-y-2">
          <p className="text-[11px] font-bold text-brand-sub/55 uppercase tracking-[0.25em]">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">Three steps. No sales pitch.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-black flex items-center justify-center">{i + 1}</span>
                <Icon className="w-5 h-5 text-brand-sub" />
              </div>
              <p className="font-bold text-brand-text">{title}</p>
              <p className="text-sm text-brand-sub leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 py-16 space-y-6">
        <h2 className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight text-center">Questions</h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-2xl border border-brand-border bg-brand-surface p-5">
              <summary className="cursor-pointer list-none font-bold text-brand-text flex justify-between items-center gap-4">
                {q}<span className="text-brand-sub group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-sm text-brand-sub leading-relaxed mt-3">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-24 text-center space-y-5">
        <FileText className="w-8 h-8 text-red-400 mx-auto" />
        <h2 className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight">Stop guessing whether you&apos;re overpaying.</h2>
        <a href="#book"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-black text-white hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
          <Receipt className="w-4 h-4" /> Book a live audit, from {FROM}
        </a>
      </section>
    </main>
  )
}
