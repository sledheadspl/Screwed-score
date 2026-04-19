import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'

interface PageConfig {
  title: string
  headline: string
  subheadline: string
  redFlags: string[]
  whatWeCheck: string[]
  ctaText: string
}

const PAGE_CONFIGS: Record<string, PageConfig> = {
  'mechanic-invoice': {
    title: 'Mechanic Invoice Overcharge Detector',
    headline: 'Is your mechanic overcharging you?',
    subheadline: 'Upload your invoice. We\'ll flag inflated labor rates, padded parts prices, and unnecessary services.',
    redFlags: [
      'Labor rates over $150/hr for standard repairs',
      '"Diagnostic fee" charged alongside a full repair',
      'Vague line items like "shop supplies" or "misc. materials"',
      'Parts marked up more than 30% over retail',
      'Services you didn\'t authorize',
    ],
    whatWeCheck: ['Labor rate vs. regional averages', 'Parts pricing', 'Duplicate charges', 'Unauthorized services', 'Vague fee items'],
    ctaText: 'Scan my mechanic invoice',
  },
  'medical-bill': {
    title: 'Medical Bill Overcharge Detector',
    headline: 'Are you being overbilled for medical care?',
    subheadline: 'Medical billing errors affect 80% of bills. Upload yours — we\'ll flag suspicious charges and unbundling.',
    redFlags: [
      'Duplicate billing for the same procedure',
      'Charges for services not received',
      'Unbundled procedures (billed separately when they should be combined)',
      'Upcoded services (billed at higher complexity than performed)',
      'Balance billing beyond your plan\'s negotiated rate',
    ],
    whatWeCheck: ['Duplicate line items', 'Upcoding patterns', 'Unbundled charges', 'Out-of-network surprises', 'Itemization accuracy'],
    ctaText: 'Scan my medical bill',
  },
  'contractor-estimate': {
    title: 'Contractor Estimate Analyzer',
    headline: 'Is your contractor estimate fair?',
    subheadline: 'Upload the estimate before you sign. We\'ll flag inflated material costs, padded labor, and missing scope items.',
    redFlags: [
      'Materials priced significantly above retail cost',
      'Vague scope that allows scope creep later',
      'No payment schedule tied to milestones',
      'Missing warranty or workmanship guarantee',
      'Change order language that\'s too broad',
    ],
    whatWeCheck: ['Material cost vs. market', 'Labor hour estimates', 'Scope clarity', 'Payment terms', 'Liability provisions'],
    ctaText: 'Scan my contractor estimate',
  },
  'lease-agreement': {
    title: 'Lease Agreement Red Flag Detector',
    headline: 'What\'s hidden in your lease?',
    subheadline: 'Upload your lease before you sign. We\'ll find clauses that favor your landlord at your expense.',
    redFlags: [
      'Broad entry rights without proper notice',
      'Automatic renewal clauses with short opt-out windows',
      'Tenant responsible for major repairs that should be landlord\'s duty',
      'Excessive late fees beyond legal limits',
      'Vague security deposit return terms',
    ],
    whatWeCheck: ['Entry and privacy rights', 'Renewal terms', 'Repair responsibilities', 'Fee structures', 'Security deposit terms'],
    ctaText: 'Scan my lease',
  },
  'phone-bill': {
    title: 'Phone & Internet Bill Analyzer',
    headline: 'Is your carrier padding your bill?',
    subheadline: 'Upload your phone or internet bill. We\'ll find hidden fees, unexplained charges, and services you never requested.',
    redFlags: [
      '"Administrative fees" not disclosed at signup',
      'Charges for services you cancelled',
      'Data overage charges despite an "unlimited" plan',
      'Equipment rental fees for devices you own',
      'Rate increases buried in your bill',
    ],
    whatWeCheck: ['Fee transparency', 'Unauthorized charges', 'Plan vs. billed services', 'Equipment charges', 'Promotional rate expiry'],
    ctaText: 'Scan my phone bill',
  },
  'brand-deal': {
    title: 'Creator Brand Deal Analyzer',
    headline: 'Is your brand deal actually fair?',
    subheadline: 'Upload your sponsorship contract before you sign. We\'ll find one-sided exclusivity, IP grabs, and undervalued deliverables.',
    redFlags: [
      'Broad IP assignment giving the brand rights to your likeness permanently',
      'Exclusivity clauses that restrict your income for months',
      'Revisions language with no defined limit',
      'Late payment terms that favor the brand',
      'Morality clauses that let them walk away without paying',
    ],
    whatWeCheck: ['IP and usage rights', 'Exclusivity scope and duration', 'Payment terms', 'Revision limits', 'Cancellation terms'],
    ctaText: 'Scan my brand deal',
  },
}

export async function generateStaticParams() {
  return Object.keys(PAGE_CONFIGS).map(type => ({ type }))
}

export async function generateMetadata({ params }: { params: { type: string } }): Promise<Metadata> {
  const config = PAGE_CONFIGS[params.type]
  if (!config) return { title: 'Not found' }

  return {
    title: `${config.title} | GetScrewedScore`,
    description: config.subheadline,
    alternates: { canonical: `https://screwedscore.com/analyze/${params.type}` },
    openGraph: {
      title: config.title,
      description: config.subheadline,
      url: `https://screwedscore.com/analyze/${params.type}`,
    },
  }
}

export default function AnalyzeLandingPage({ params }: { params: { type: string } }) {
  const config = PAGE_CONFIGS[params.type]
  if (!config) notFound()

  return (
    <div className="min-h-screen bg-brand-bg">
      <nav className="border-b border-brand-border bg-brand-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-lg font-black text-brand-text">Get</span>
            <span className="text-lg font-black text-red-400">Screwed</span>
            <span className="text-lg font-black text-brand-text">Score</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-10">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-brand-text leading-tight">{config.headline}</h1>
          <p className="text-lg text-brand-subtext leading-relaxed">{config.subheadline}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            {config.ctaText} — free →
          </Link>
        </div>

        {/* ── Common Red Flags ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-brand-text">Common red flags we detect</h2>
          <ul className="space-y-3">
            {config.redFlags.map((flag, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="text-red-400 font-bold shrink-0 mt-0.5">⚠</span>
                <span className="text-sm text-brand-text/80">{flag}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── What We Check ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-brand-border bg-brand-surface p-5 space-y-3">
          <h2 className="text-sm font-semibold text-brand-subtext uppercase tracking-wider">What our AI checks</h2>
          <div className="flex flex-wrap gap-2">
            {config.whatWeCheck.map((item, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg bg-brand-muted border border-brand-border text-xs text-brand-text">
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold text-brand-text">Get your Screwed Score free</h2>
          <p className="text-brand-subtext text-sm">No account needed. Results in ~20 seconds.</p>
          <Link
            href="/"
            className="inline-block px-8 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Upload your document →
          </Link>
        </div>

      </main>
    </div>
  )
}
