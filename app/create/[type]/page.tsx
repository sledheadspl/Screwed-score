import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import CreatePage from '@/app/create/page'

// Slug → internal type + SEO copy
const TYPE_META: Record<string, {
  type: string
  title: string
  description: string
  h1: string
  keywords: string[]
}> = {
  invoice: {
    type: 'invoice',
    title: 'Free Invoice Generator — Create Professional Invoices Instantly',
    description: 'Generate a professional invoice in seconds. Add your logo, line items, tax, and payment terms. Free AI invoice maker — no account needed, print to PDF.',
    h1: 'Free Invoice Generator',
    keywords: ['free invoice generator', 'free invoice maker', 'invoice template free', 'create invoice online free', 'professional invoice maker'],
  },
  estimate: {
    type: 'estimate',
    title: 'Free Job Estimate Generator — Professional Quote Templates',
    description: 'Create a professional job estimate or quote instantly. Add labor, materials, scope of work, and a signature block. Free AI estimate generator.',
    h1: 'Free Job Estimate & Quote Generator',
    keywords: ['free job estimate template', 'free quote generator', 'contractor estimate template', 'job estimate maker', 'free bid template'],
  },
  'service-contract': {
    type: 'service_contract',
    title: 'Free Service Contract Generator — AI-Powered Agreements',
    description: 'Generate a professional service agreement or contract in seconds. Covers scope of work, payment terms, IP, liability, and termination. Free AI contract maker.',
    h1: 'Free Service Contract Generator',
    keywords: ['free service contract generator', 'free service agreement template', 'freelance contract template free', 'contract maker free'],
  },
  'lease-agreement': {
    type: 'lease_agreement',
    title: 'Free Lease Agreement Generator — Residential & Commercial',
    description: 'Create a complete residential lease agreement instantly. Includes rent, deposit, pets, utilities, entry notice, and move-out terms. Free AI lease generator.',
    h1: 'Free Lease Agreement Generator',
    keywords: ['free lease agreement generator', 'free rental lease template', 'residential lease agreement template', 'free lease agreement maker'],
  },
  'rental-agreement': {
    type: 'rental_agreement',
    title: 'Free Rental Agreement Generator — Short-Term & Equipment Rentals',
    description: 'Create a short-term rental agreement for vehicles, equipment, or property. Includes deposit, damage, return terms. Free AI rental agreement generator.',
    h1: 'Free Rental Agreement Generator',
    keywords: ['free rental agreement template', 'short term rental agreement', 'vehicle rental agreement template', 'equipment rental agreement free'],
  },
  'demand-letter': {
    type: 'demand_letter',
    title: 'Free Demand Letter Generator — Send a Formal Demand for Payment',
    description: 'Generate a professional demand letter for unpaid debts, refunds, or disputes. Includes legal basis, deadline, and consequences. Free AI demand letter maker.',
    h1: 'Free Demand Letter Generator',
    keywords: ['free demand letter generator', 'demand letter template free', 'demand for payment letter', 'free legal demand letter', 'collection demand letter'],
  },
  nda: {
    type: 'nda',
    title: 'Free NDA Generator — Non-Disclosure Agreement Templates',
    description: 'Generate a professional non-disclosure agreement instantly. Covers confidential information, obligations, exclusions, and remedies. Free AI NDA maker.',
    h1: 'Free NDA Generator',
    keywords: ['free NDA generator', 'free non-disclosure agreement template', 'NDA template free', 'confidentiality agreement template free', 'free NDA maker'],
  },
  'court-paperwork': {
    type: 'court_paperwork',
    title: 'Free Small Claims Court Forms — Statement of Claim Generator',
    description: 'Generate a small claims court complaint or statement of claim. Includes plaintiff/defendant info, facts, and relief requested. Free AI court form generator.',
    h1: 'Free Small Claims Court Form Generator',
    keywords: ['free small claims court form', 'small claims complaint template', 'statement of claim template', 'free court filing template', 'small claims form generator'],
  },
  'bill-of-sale': {
    type: 'bill_of_sale',
    title: 'Free Bill of Sale Generator — Vehicles, Equipment & More',
    description: 'Generate a professional bill of sale for cars, trucks, equipment, or any item. Includes as-is warranty, payment method, and signatures. Free AI bill of sale generator.',
    h1: 'Free Bill of Sale Generator',
    keywords: ['free bill of sale generator', 'bill of sale template free', 'vehicle bill of sale free', 'car bill of sale template', 'free bill of sale maker'],
  },
  'promissory-note': {
    type: 'promissory_note',
    title: 'Free Promissory Note Generator — Loan & IOU Templates',
    description: 'Create a legally sound promissory note or loan agreement. Includes interest rate, repayment schedule, late fees, and default clause. Free AI promissory note generator.',
    h1: 'Free Promissory Note Generator',
    keywords: ['free promissory note generator', 'promissory note template free', 'loan agreement template free', 'IOU template', 'free loan document generator'],
  },
  receipt: {
    type: 'receipt',
    title: 'Free Receipt Generator — Professional Payment Receipts',
    description: 'Generate a professional payment receipt instantly. Includes itemized services, amount, payment method, and paid-in-full acknowledgment. Free AI receipt maker.',
    h1: 'Free Receipt Generator',
    keywords: ['free receipt generator', 'payment receipt template free', 'receipt maker free', 'professional receipt generator', 'free receipt maker online'],
  },
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params
  const meta = TYPE_META[type]
  if (!meta) return {}
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical: `https://screwedscore.com/create/${type}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://screwedscore.com/create/${type}`,
      siteName: 'GetScrewedScore',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      site: '@screwedscore',
    },
  }
}

export function generateStaticParams() {
  return Object.keys(TYPE_META).map(type => ({ type }))
}

export default async function CreateTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  const meta = TYPE_META[type]
  if (!meta) notFound()

  // Pass defaultType to the client component — it will auto-select and scroll to the form
  type DocType = 'invoice' | 'estimate' | 'service_contract' | 'lease_agreement' | 'rental_agreement' | 'demand_letter' | 'nda' | 'court_paperwork' | 'bill_of_sale' | 'promissory_note' | 'receipt'
  return <CreatePage defaultType={meta.type as DocType} />
}
