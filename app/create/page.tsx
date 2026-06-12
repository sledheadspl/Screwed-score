'use client'

import { useState, useRef, useCallback } from 'react'
import {
  FileText, Receipt, Home, Key, AlertCircle, Shield,
  Gavel, Plus, Trash2, Download, RotateCcw,
  Loader2, CheckCircle, DollarSign, Sparkles, ArrowRight,
  Tag, HandCoins, ScrollText,
} from 'lucide-react'

type DocType =
  | 'invoice'
  | 'estimate'
  | 'service_contract'
  | 'lease_agreement'
  | 'rental_agreement'
  | 'demand_letter'
  | 'nda'
  | 'court_paperwork'
  | 'bill_of_sale'
  | 'promissory_note'
  | 'receipt'

interface LineItem { description: string; qty: string; price: string }

const DOC_TYPES: { id: DocType; label: string; icon: React.ReactNode; desc: string; accent: string }[] = [
  { id: 'invoice',          label: 'Invoice',              icon: <Receipt className="w-5 h-5" />,    desc: 'Bill a client for goods or services', accent: 'cyan' },
  { id: 'estimate',         label: 'Job Estimate / Quote', icon: <DollarSign className="w-5 h-5" />, desc: 'Provide a price estimate before work', accent: 'yellow' },
  { id: 'service_contract', label: 'Service Contract',     icon: <FileText className="w-5 h-5" />,   desc: 'Agreement for ongoing or project work', accent: 'green' },
  { id: 'lease_agreement',  label: 'Lease Agreement',      icon: <Home className="w-5 h-5" />,       desc: 'Residential or commercial lease', accent: 'cyan' },
  { id: 'rental_agreement', label: 'Rental Agreement',     icon: <Key className="w-5 h-5" />,        desc: 'Short-term rental of property or items', accent: 'yellow' },
  { id: 'demand_letter',    label: 'Demand Letter',        icon: <AlertCircle className="w-5 h-5" />,desc: 'Formal demand for payment or action', accent: 'red' },
  { id: 'nda',              label: 'NDA',                  icon: <Shield className="w-5 h-5" />,     desc: 'Non-disclosure / confidentiality agreement', accent: 'green' },
  { id: 'court_paperwork',  label: 'Court / Small Claims', icon: <Gavel className="w-5 h-5" />,      desc: 'Small claims complaint or court filing', accent: 'red' },
  { id: 'bill_of_sale',     label: 'Bill of Sale',         icon: <Tag className="w-5 h-5" />,         desc: 'Sell a vehicle, equipment, or any item', accent: 'cyan' },
  { id: 'promissory_note',  label: 'Promissory Note',      icon: <HandCoins className="w-5 h-5" />,   desc: 'Formal loan or IOU agreement', accent: 'yellow' },
  { id: 'receipt',          label: 'Receipt',              icon: <ScrollText className="w-5 h-5" />,  desc: 'Proof of payment received', accent: 'green' },
]

const ACCENT_STYLES: Record<string, { border: string; text: string; bg: string; btn: string }> = {
  cyan:   { border: 'border-cyan-500/40',   text: 'text-cyan-400',   bg: 'bg-cyan-500/10',   btn: 'bg-cyan-500 hover:bg-cyan-400' },
  yellow: { border: 'border-yellow-500/40', text: 'text-yellow-400', bg: 'bg-yellow-500/10', btn: 'bg-yellow-500 hover:bg-yellow-400' },
  green:  { border: 'border-green-500/40',  text: 'text-green-400',  bg: 'bg-green-500/10',  btn: 'bg-green-500 hover:bg-green-400' },
  red:    { border: 'border-red-500/40',    text: 'text-red-400',    bg: 'bg-red-500/10',    btn: 'bg-red-500 hover:bg-red-400' },
}

function Field({ label, id, value, onChange, placeholder, type = 'text', rows }: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; rows?: number
}) {
  const cls = 'w-full bg-brand-surface2 border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-sub focus:outline-none focus:border-brand-sub/60 transition-colors'
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-brand-sub uppercase tracking-wider mb-1.5">{label}</label>
      {rows ? (
        <textarea id={id} rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      ) : (
        <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-brand-sub uppercase tracking-widest border-b border-brand-border/60 pb-2">{title}</p>
      {children}
    </div>
  )
}

function LineItemsEditor({ items, onAdd, onRemove, onUpdate }: {
  items: LineItem[]
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, k: keyof LineItem, v: string) => void
}) {
  return (
    <Section title="Line Items">
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              value={item.description}
              onChange={e => onUpdate(i, 'description', e.target.value)}
              placeholder="Description of service or item"
              className="flex-1 bg-brand-surface2 border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-sub focus:outline-none focus:border-brand-sub/60 transition-colors"
            />
            <input
              value={item.qty}
              onChange={e => onUpdate(i, 'qty', e.target.value)}
              placeholder="Qty"
              className="w-16 bg-brand-surface2 border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-sub focus:outline-none focus:border-brand-sub/60 transition-colors"
            />
            <input
              value={item.price}
              onChange={e => onUpdate(i, 'price', e.target.value)}
              placeholder="Unit $"
              className="w-24 bg-brand-surface2 border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder:text-brand-sub focus:outline-none focus:border-brand-sub/60 transition-colors"
            />
            {items.length > 1 && (
              <button onClick={() => onRemove(i)} className="p-2 text-brand-sub hover:text-red-400 transition-colors mt-0.5">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-xs text-brand-sub hover:text-brand-text border border-dashed border-brand-border hover:border-brand-sub/60 rounded-lg px-3 py-2 transition-colors w-full justify-center"
        >
          <Plus className="w-3.5 h-3.5" /> Add Line Item
        </button>
      </div>
    </Section>
  )
}

// Keyword rules to auto-detect doc type from a plain-English prompt
const KEYWORD_MAP: [DocType, RegExp][] = [
  ['invoice',          /\b(invoice|bill(ing)?( a client)?|charge( for)?|receipt for)\b/i],
  ['estimate',         /\b(estimate|quote|quotation|bid|price for|cost for|how much|proposal)\b/i],
  ['service_contract', /\b(contract|service agreement|freelance|hire|engagement|scope of work|consulting)\b/i],
  ['lease_agreement',  /\b(lease|leasing|residential lease|apartment|rental property|landlord|tenant)\b/i],
  ['rental_agreement', /\b(rent(ing|al)? (out|a )?(car|truck|vehicle|equipment|tool|item)|short.?term rental)\b/i],
  ['demand_letter',    /\b(demand (letter|payment)|demand for|owe me|owes me|owed money|collect debt|haven.t paid)\b/i],
  ['nda',              /\b(nda|non.?disclosure|confidential(ity)?|secret|proprietary|trade secret)\b/i],
  ['court_paperwork',  /\b(court|sue|suing|small claims|lawsuit|complaint|plaintiff|defendant|legal action|file a claim)\b/i],
  ['bill_of_sale',     /\b(bill of sale|selling (a |my )?(car|truck|vehicle|item|equipment)|sold (a|my)|transfer ownership)\b/i],
  ['promissory_note',  /\b(promissory note|loan|lend|lending|owe|iou|borrow(ing)?|repay)\b/i],
  ['receipt',          /\b(receipt|proof of payment|paid for|payment received|acknowledge payment)\b/i],
]

function detectDocType(text: string): DocType | null {
  const lower = text.toLowerCase()
  for (const [type, re] of KEYWORD_MAP) {
    if (re.test(lower)) return type
  }
  return null
}

export default function CreatePage() {
  const [prompt, setPrompt] = useState('')
  const [promptDone, setPromptDone] = useState(false)
  const [selected, setSelected] = useState<DocType | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', qty: '1', price: '' }])
  const [loading, setLoading] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const set = (key: string, val: string) => setFields(f => ({ ...f, [key]: val }))

  const handlePromptSubmit = useCallback(() => {
    if (!prompt.trim()) return
    setPromptDone(true)
    const detected = detectDocType(prompt)
    if (detected) {
      setSelected(detected)
      setFields({})
      setHtml(null)
      setError(null)
      setLineItems([{ description: '', qty: '1', price: '' }])
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [prompt])

  const addLine = () => setLineItems(l => [...l, { description: '', qty: '1', price: '' }])
  const removeLine = (i: number) => setLineItems(l => l.filter((_, idx) => idx !== i))
  const updateLine = (i: number, k: keyof LineItem, v: string) =>
    setLineItems(l => l.map((item, idx) => idx === i ? { ...item, [k]: v } : item))

  const handleSelect = (id: DocType) => {
    setSelected(id)
    setFields({})
    setHtml(null)
    setError(null)
    setLineItems([{ description: '', qty: '1', price: '' }])
  }

  const buildFields = () => {
    const all = { ...fields }
    if (selected === 'invoice' || selected === 'estimate') {
      const items = lineItems
        .filter(l => l.description.trim())
        .map((l, i) => `Item ${i + 1}: ${l.description} | Qty: ${l.qty} | Unit Price: $${l.price}`)
        .join('\n')
      all['Line Items'] = items
    }
    return all
  }

  const generate = async () => {
    if (!selected) return
    setLoading(true)
    setError(null)
    setHtml(null)
    try {
      const res = await fetch('/api/create-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selected, fields: buildFields(), userPrompt: prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setHtml(data.html)
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Document</title><style>
      body { margin: 0; padding: 0; font-family: Georgia, serif; }
      @media print { @page { margin: 0.75in; } }
    </style></head><body>${html}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  const docMeta = DOC_TYPES.find(d => d.id === selected)
  const accent = docMeta ? ACCENT_STYLES[docMeta.accent] : ACCENT_STYLES.cyan

  return (
    <main className="min-h-screen bg-brand-bg">
      {/* Hero + Prompt */}
      <div className="border-b border-brand-border/40 bg-brand-surface/40">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-14 text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-brand-sub uppercase tracking-widest border border-brand-border rounded-full px-3 py-1">
            <FileText className="w-3 h-3" /> Document Creator
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
            What do you need to create?
          </h1>
          <p className="text-brand-sub text-sm">
            Describe it in plain English — we&apos;ll figure out the rest.
          </p>

          {/* Prompt input */}
          <div className="relative">
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePromptSubmit()}
              placeholder="e.g. I need to invoice a client for auto repair work…"
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-5 py-4 pr-14 text-sm text-brand-text placeholder:text-brand-sub focus:outline-none focus:border-brand-sub/60 transition-colors"
            />
            <button
              onClick={handlePromptSubmit}
              disabled={!prompt.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-lg bg-brand-red hover:bg-red-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {promptDone && selected && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs text-green-400">
                <Sparkles className="w-3.5 h-3.5" />
                Detected: <strong>{DOC_TYPES.find(d => d.id === selected)?.label}</strong> — generating from your description or fill in details below.
              </div>
              <button
                onClick={generate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-brand-red hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><Sparkles className="w-4 h-4" /> Quick Generate from description</>
                }
              </button>
              <p className="text-xs text-brand-sub text-center">or fill in the form below for more control</p>
            </div>
          )}
          {promptDone && !selected && (
            <p className="text-xs text-brand-sub">
              Not sure — pick a type below and we&apos;ll handle the rest.
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 space-y-10">

        {/* Document type selector */}
        <div>
          <p className="text-xs font-bold text-brand-sub uppercase tracking-widest mb-4">
            {promptDone ? 'Or choose a different type' : 'Choose Document Type'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DOC_TYPES.map(dt => {
              const a = ACCENT_STYLES[dt.accent]
              const isActive = selected === dt.id
              return (
                <button
                  key={dt.id}
                  onClick={() => handleSelect(dt.id)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? `${a.border} ${a.bg} ${a.text}`
                      : 'border-brand-border bg-brand-surface hover:border-brand-sub/40 hover:bg-brand-muted text-brand-sub hover:text-brand-text'
                  }`}
                >
                  <div className="mb-2">{dt.icon}</div>
                  <div className="text-sm font-bold leading-tight mb-1">{dt.label}</div>
                  <div className={`text-xs leading-snug ${isActive ? 'opacity-80' : 'text-brand-sub'}`}>{dt.desc}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Form */}
        {selected && (
          <div ref={formRef} className={`rounded-2xl border ${accent.border} bg-brand-surface p-6 space-y-6`}>
            <div className="flex items-center gap-2">
              <span className={accent.text}>{docMeta?.icon}</span>
              <h2 className="font-black text-brand-text">{docMeta?.label}</h2>
              <span className="text-brand-sub text-xs ml-1">— fill in what you know, leave the rest blank</span>
            </div>

            {selected === 'invoice' && (
              <>
                <Section title="Your Business (From)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Business / Your Name" id="from_name" value={fields.from_name ?? ''} onChange={v => set('from_name', v)} placeholder="Ace Auto Repair" />
                    <Field label="Email" id="from_email" value={fields.from_email ?? ''} onChange={v => set('from_email', v)} placeholder="you@email.com" />
                    <Field label="Phone" id="from_phone" value={fields.from_phone ?? ''} onChange={v => set('from_phone', v)} placeholder="(555) 000-0000" />
                    <Field label="Address" id="from_address" value={fields.from_address ?? ''} onChange={v => set('from_address', v)} placeholder="123 Main St, City, ST 00000" />
                  </div>
                </Section>
                <Section title="Client (Bill To)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Client Name / Business" id="to_name" value={fields.to_name ?? ''} onChange={v => set('to_name', v)} placeholder="John Smith" />
                    <Field label="Client Email" id="to_email" value={fields.to_email ?? ''} onChange={v => set('to_email', v)} placeholder="client@email.com" />
                    <Field label="Client Address" id="to_address" value={fields.to_address ?? ''} onChange={v => set('to_address', v)} placeholder="456 Oak Ave, City, ST 00000" />
                  </div>
                </Section>
                <Section title="Invoice Details">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Invoice #" id="invoice_number" value={fields.invoice_number ?? ''} onChange={v => set('invoice_number', v)} placeholder="INV-001" />
                    <Field label="Invoice Date" id="invoice_date" value={fields.invoice_date ?? ''} onChange={v => set('invoice_date', v)} type="date" />
                    <Field label="Due Date" id="due_date" value={fields.due_date ?? ''} onChange={v => set('due_date', v)} type="date" />
                    <Field label="Tax Rate (%)" id="tax_rate" value={fields.tax_rate ?? ''} onChange={v => set('tax_rate', v)} placeholder="8.25" />
                    <Field label="Payment Terms" id="payment_terms" value={fields.payment_terms ?? ''} onChange={v => set('payment_terms', v)} placeholder="Net 30 / Due on receipt" />
                  </div>
                </Section>
                <LineItemsEditor items={lineItems} onAdd={addLine} onRemove={removeLine} onUpdate={updateLine} />
                <Field label="Notes / Additional Info" id="notes" value={fields.notes ?? ''} onChange={v => set('notes', v)} placeholder="Thank you for your business!" rows={2} />
              </>
            )}

            {selected === 'estimate' && (
              <>
                <Section title="Your Business">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Business / Your Name" id="from_name" value={fields.from_name ?? ''} onChange={v => set('from_name', v)} placeholder="Ace Contractors LLC" />
                    <Field label="License #" id="license_number" value={fields.license_number ?? ''} onChange={v => set('license_number', v)} placeholder="LIC-123456" />
                    <Field label="Phone" id="from_phone" value={fields.from_phone ?? ''} onChange={v => set('from_phone', v)} placeholder="(555) 000-0000" />
                    <Field label="Email" id="from_email" value={fields.from_email ?? ''} onChange={v => set('from_email', v)} placeholder="you@email.com" />
                  </div>
                </Section>
                <Section title="Prepared For">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Customer Name" id="to_name" value={fields.to_name ?? ''} onChange={v => set('to_name', v)} placeholder="Jane Doe" />
                    <Field label="Property / Job Address" id="job_address" value={fields.job_address ?? ''} onChange={v => set('job_address', v)} placeholder="789 Elm St, City, ST 00000" />
                  </div>
                </Section>
                <Section title="Estimate Details">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Estimate #" id="estimate_number" value={fields.estimate_number ?? ''} onChange={v => set('estimate_number', v)} placeholder="EST-001" />
                    <Field label="Date" id="estimate_date" value={fields.estimate_date ?? ''} onChange={v => set('estimate_date', v)} type="date" />
                    <Field label="Valid Until" id="valid_until" value={fields.valid_until ?? ''} onChange={v => set('valid_until', v)} type="date" />
                    <Field label="Tax Rate (%)" id="tax_rate" value={fields.tax_rate ?? ''} onChange={v => set('tax_rate', v)} placeholder="8.25" />
                  </div>
                </Section>
                <Field label="Scope of Work / Description" id="scope" value={fields.scope ?? ''} onChange={v => set('scope', v)} placeholder="Describe the job..." rows={3} />
                <LineItemsEditor items={lineItems} onAdd={addLine} onRemove={removeLine} onUpdate={updateLine} />
                <Field label="Exclusions / Not Included" id="exclusions" value={fields.exclusions ?? ''} onChange={v => set('exclusions', v)} placeholder="Permit fees, debris hauling..." rows={2} />
              </>
            )}

            {selected === 'service_contract' && (
              <>
                <Section title="Service Provider">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Provider Name / Business" id="provider_name" value={fields.provider_name ?? ''} onChange={v => set('provider_name', v)} placeholder="ABC Services LLC" />
                    <Field label="Provider Address" id="provider_address" value={fields.provider_address ?? ''} onChange={v => set('provider_address', v)} placeholder="123 Main St, City, ST" />
                  </div>
                </Section>
                <Section title="Client">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Client Name / Business" id="client_name" value={fields.client_name ?? ''} onChange={v => set('client_name', v)} placeholder="John Smith" />
                    <Field label="Client Address" id="client_address" value={fields.client_address ?? ''} onChange={v => set('client_address', v)} placeholder="456 Oak Ave, City, ST" />
                  </div>
                </Section>
                <Section title="Agreement Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Effective Date" id="effective_date" value={fields.effective_date ?? ''} onChange={v => set('effective_date', v)} type="date" />
                    <Field label="End Date (or Ongoing)" id="end_date" value={fields.end_date ?? ''} onChange={v => set('end_date', v)} placeholder="Ongoing / MM/DD/YYYY" />
                    <Field label="Payment Amount" id="payment_amount" value={fields.payment_amount ?? ''} onChange={v => set('payment_amount', v)} placeholder="$500/month or $2,000 flat" />
                    <Field label="Payment Schedule" id="payment_schedule" value={fields.payment_schedule ?? ''} onChange={v => set('payment_schedule', v)} placeholder="Monthly / Upon completion" />
                    <Field label="Governing State" id="governing_state" value={fields.governing_state ?? ''} onChange={v => set('governing_state', v)} placeholder="Texas" />
                  </div>
                </Section>
                <Field label="Services to be Provided" id="services" value={fields.services ?? ''} onChange={v => set('services', v)} placeholder="Describe the services in detail..." rows={4} />
              </>
            )}

            {selected === 'lease_agreement' && (
              <>
                <Section title="Landlord">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Landlord Name" id="landlord_name" value={fields.landlord_name ?? ''} onChange={v => set('landlord_name', v)} placeholder="Robert Johnson" />
                    <Field label="Landlord Address / Mailing" id="landlord_address" value={fields.landlord_address ?? ''} onChange={v => set('landlord_address', v)} placeholder="PO Box 100, City, ST" />
                    <Field label="Landlord Phone" id="landlord_phone" value={fields.landlord_phone ?? ''} onChange={v => set('landlord_phone', v)} placeholder="(555) 000-0000" />
                    <Field label="Landlord Email" id="landlord_email" value={fields.landlord_email ?? ''} onChange={v => set('landlord_email', v)} placeholder="landlord@email.com" />
                  </div>
                </Section>
                <Section title="Tenant(s)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Tenant Name(s)" id="tenant_names" value={fields.tenant_names ?? ''} onChange={v => set('tenant_names', v)} placeholder="Jane Doe, John Doe" />
                    <Field label="Tenant Phone" id="tenant_phone" value={fields.tenant_phone ?? ''} onChange={v => set('tenant_phone', v)} placeholder="(555) 111-2222" />
                  </div>
                </Section>
                <Section title="Property & Terms">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Property Address" id="property_address" value={fields.property_address ?? ''} onChange={v => set('property_address', v)} placeholder="789 Maple Dr, City, ST 00000" />
                    <Field label="Lease Start Date" id="lease_start" value={fields.lease_start ?? ''} onChange={v => set('lease_start', v)} type="date" />
                    <Field label="Lease End Date" id="lease_end" value={fields.lease_end ?? ''} onChange={v => set('lease_end', v)} type="date" />
                    <Field label="Monthly Rent ($)" id="monthly_rent" value={fields.monthly_rent ?? ''} onChange={v => set('monthly_rent', v)} placeholder="1200" />
                    <Field label="Security Deposit ($)" id="security_deposit" value={fields.security_deposit ?? ''} onChange={v => set('security_deposit', v)} placeholder="1200" />
                    <Field label="Rent Due Day" id="due_day" value={fields.due_day ?? ''} onChange={v => set('due_day', v)} placeholder="1st of each month" />
                    <Field label="Late Fee" id="late_fee" value={fields.late_fee ?? ''} onChange={v => set('late_fee', v)} placeholder="$50 after 5-day grace" />
                    <Field label="Pets Allowed?" id="pets" value={fields.pets ?? ''} onChange={v => set('pets', v)} placeholder="No pets / Dogs under 25 lbs with $200 deposit" />
                    <Field label="Utilities Included" id="utilities" value={fields.utilities ?? ''} onChange={v => set('utilities', v)} placeholder="Water/trash included; tenant pays electric/gas" />
                    <Field label="Governing State" id="governing_state" value={fields.governing_state ?? ''} onChange={v => set('governing_state', v)} placeholder="California" />
                  </div>
                </Section>
              </>
            )}

            {selected === 'rental_agreement' && (
              <>
                <Section title="Owner">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Owner Name" id="owner_name" value={fields.owner_name ?? ''} onChange={v => set('owner_name', v)} placeholder="Mike's Equipment" />
                    <Field label="Owner Phone / Email" id="owner_contact" value={fields.owner_contact ?? ''} onChange={v => set('owner_contact', v)} placeholder="(555) 000-0000" />
                  </div>
                </Section>
                <Section title="Renter">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Renter Name" id="renter_name" value={fields.renter_name ?? ''} onChange={v => set('renter_name', v)} placeholder="Sarah Lee" />
                    <Field label="Renter ID / License #" id="renter_id" value={fields.renter_id ?? ''} onChange={v => set('renter_id', v)} placeholder="DL-987654321" />
                  </div>
                </Section>
                <Section title="Rental Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Item(s) Being Rented" id="rental_item" value={fields.rental_item ?? ''} onChange={v => set('rental_item', v)} placeholder="2019 Ford F-150, SN: 12345" />
                    <Field label="Condition at Pickup" id="condition" value={fields.condition ?? ''} onChange={v => set('condition', v)} placeholder="Good — minor scratch front bumper" />
                    <Field label="Rental Start" id="rental_start" value={fields.rental_start ?? ''} onChange={v => set('rental_start', v)} type="date" />
                    <Field label="Rental End" id="rental_end" value={fields.rental_end ?? ''} onChange={v => set('rental_end', v)} type="date" />
                    <Field label="Rate" id="rate" value={fields.rate ?? ''} onChange={v => set('rate', v)} placeholder="$75/day or $300/week" />
                    <Field label="Total Amount" id="total" value={fields.total ?? ''} onChange={v => set('total', v)} placeholder="$300" />
                    <Field label="Security Deposit ($)" id="deposit" value={fields.deposit ?? ''} onChange={v => set('deposit', v)} placeholder="500" />
                  </div>
                </Section>
              </>
            )}

            {selected === 'demand_letter' && (
              <>
                <Section title="From (Sender)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Your Name" id="sender_name" value={fields.sender_name ?? ''} onChange={v => set('sender_name', v)} placeholder="John Smith" />
                    <Field label="Your Address" id="sender_address" value={fields.sender_address ?? ''} onChange={v => set('sender_address', v)} placeholder="123 Main St, City, ST 00000" />
                    <Field label="Your Phone / Email" id="sender_contact" value={fields.sender_contact ?? ''} onChange={v => set('sender_contact', v)} placeholder="(555) 000-0000" />
                  </div>
                </Section>
                <Section title="To (Recipient)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Recipient Name / Business" id="recipient_name" value={fields.recipient_name ?? ''} onChange={v => set('recipient_name', v)} placeholder="ABC Company / Joe's Auto" />
                    <Field label="Recipient Address" id="recipient_address" value={fields.recipient_address ?? ''} onChange={v => set('recipient_address', v)} placeholder="456 Business Blvd, City, ST" />
                  </div>
                </Section>
                <Section title="Dispute Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Letter Date" id="letter_date" value={fields.letter_date ?? ''} onChange={v => set('letter_date', v)} type="date" />
                    <Field label="Amount Demanded ($)" id="amount" value={fields.amount ?? ''} onChange={v => set('amount', v)} placeholder="1500" />
                    <Field label="Response Deadline (days)" id="deadline_days" value={fields.deadline_days ?? ''} onChange={v => set('deadline_days', v)} placeholder="14" />
                  </div>
                  <Field label="Description of the Dispute" id="dispute_description" value={fields.dispute_description ?? ''} onChange={v => set('dispute_description', v)} placeholder="Explain what happened, when, and why you are owed this money or action..." rows={4} />
                  <Field label="What You're Demanding" id="demand" value={fields.demand ?? ''} onChange={v => set('demand', v)} placeholder="Full refund of $1,500 / Repair the damage at no cost..." rows={2} />
                </Section>
              </>
            )}

            {selected === 'nda' && (
              <>
                <Section title="Disclosing Party">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Name / Business" id="disclosing_name" value={fields.disclosing_name ?? ''} onChange={v => set('disclosing_name', v)} placeholder="Acme Corp" />
                    <Field label="Address" id="disclosing_address" value={fields.disclosing_address ?? ''} onChange={v => set('disclosing_address', v)} placeholder="123 Business Rd, City, ST" />
                  </div>
                </Section>
                <Section title="Receiving Party">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Name / Business" id="receiving_name" value={fields.receiving_name ?? ''} onChange={v => set('receiving_name', v)} placeholder="John Doe / Freelancer LLC" />
                    <Field label="Address" id="receiving_address" value={fields.receiving_address ?? ''} onChange={v => set('receiving_address', v)} placeholder="456 Creative Ave, City, ST" />
                  </div>
                </Section>
                <Section title="NDA Terms">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Effective Date" id="effective_date" value={fields.effective_date ?? ''} onChange={v => set('effective_date', v)} type="date" />
                    <Field label="Duration (years)" id="duration" value={fields.duration ?? ''} onChange={v => set('duration', v)} placeholder="2" />
                    <Field label="Governing State" id="governing_state" value={fields.governing_state ?? ''} onChange={v => set('governing_state', v)} placeholder="Delaware" />
                  </div>
                  <Field label="Description of Confidential Information" id="conf_info" value={fields.conf_info ?? ''} onChange={v => set('conf_info', v)} placeholder="Business plans, customer lists, proprietary software, trade secrets..." rows={3} />
                  <Field label="Purpose / Reason for Disclosure" id="purpose" value={fields.purpose ?? ''} onChange={v => set('purpose', v)} placeholder="Exploring a potential business partnership" rows={2} />
                </Section>
              </>
            )}

            {selected === 'court_paperwork' && (
              <>
                <Section title="Plaintiff (You)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Your Name" id="plaintiff_name" value={fields.plaintiff_name ?? ''} onChange={v => set('plaintiff_name', v)} placeholder="Jane Doe" />
                    <Field label="Your Address" id="plaintiff_address" value={fields.plaintiff_address ?? ''} onChange={v => set('plaintiff_address', v)} placeholder="123 Main St, City, ST 00000" />
                    <Field label="Your Phone" id="plaintiff_phone" value={fields.plaintiff_phone ?? ''} onChange={v => set('plaintiff_phone', v)} placeholder="(555) 000-0000" />
                  </div>
                </Section>
                <Section title="Defendant (They)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Defendant Name / Business" id="defendant_name" value={fields.defendant_name ?? ''} onChange={v => set('defendant_name', v)} placeholder="Joe's Auto Repair" />
                    <Field label="Defendant Address" id="defendant_address" value={fields.defendant_address ?? ''} onChange={v => set('defendant_address', v)} placeholder="456 Elm St, City, ST 00000" />
                  </div>
                </Section>
                <Section title="Claim Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Amount Claimed ($)" id="amount_claimed" value={fields.amount_claimed ?? ''} onChange={v => set('amount_claimed', v)} placeholder="3200" />
                    <Field label="Filing Date" id="filing_date" value={fields.filing_date ?? ''} onChange={v => set('filing_date', v)} type="date" />
                    <Field label="State / Jurisdiction" id="jurisdiction" value={fields.jurisdiction ?? ''} onChange={v => set('jurisdiction', v)} placeholder="Texas" />
                  </div>
                  <Field label="Basis of Claim" id="claim_basis" value={fields.claim_basis ?? ''} onChange={v => set('claim_basis', v)} placeholder="Breach of contract — mechanic failed to complete agreed repairs" rows={2} />
                  <Field label="Statement of Facts (what happened, in order)" id="facts" value={fields.facts ?? ''} onChange={v => set('facts', v)} placeholder="On [date] I brought my vehicle in for... The mechanic agreed to... They failed to..." rows={5} />
                  <Field label="Relief Requested" id="relief" value={fields.relief ?? ''} onChange={v => set('relief', v)} placeholder="$3,200 for cost of repairs, $200 towing fee, and court costs" rows={2} />
                </Section>
              </>
            )}

            {selected === 'bill_of_sale' && (
              <>
                <Section title="Seller">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Seller Name" id="seller_name" value={fields.seller_name ?? ''} onChange={v => set('seller_name', v)} placeholder="Mike Johnson" />
                    <Field label="Seller Address" id="seller_address" value={fields.seller_address ?? ''} onChange={v => set('seller_address', v)} placeholder="123 Main St, City, ST 00000" />
                    <Field label="Seller Phone / Email" id="seller_contact" value={fields.seller_contact ?? ''} onChange={v => set('seller_contact', v)} placeholder="(555) 000-0000" />
                  </div>
                </Section>
                <Section title="Buyer">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Buyer Name" id="buyer_name" value={fields.buyer_name ?? ''} onChange={v => set('buyer_name', v)} placeholder="Sarah Lee" />
                    <Field label="Buyer Address" id="buyer_address" value={fields.buyer_address ?? ''} onChange={v => set('buyer_address', v)} placeholder="456 Oak Ave, City, ST 00000" />
                  </div>
                </Section>
                <Section title="Item Being Sold">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Item Description" id="item_description" value={fields.item_description ?? ''} onChange={v => set('item_description', v)} placeholder="2018 Honda Civic, VIN: 1HGC..." />
                    <Field label="Condition" id="condition" value={fields.condition ?? ''} onChange={v => set('condition', v)} placeholder="Used — good condition" />
                    <Field label="Sale Price ($)" id="sale_price" value={fields.sale_price ?? ''} onChange={v => set('sale_price', v)} placeholder="8500" />
                    <Field label="Payment Method" id="payment_method" value={fields.payment_method ?? ''} onChange={v => set('payment_method', v)} placeholder="Cash / Cashier's Check / Zelle" />
                    <Field label="Date of Sale" id="sale_date" value={fields.sale_date ?? ''} onChange={v => set('sale_date', v)} type="date" />
                  </div>
                </Section>
              </>
            )}

            {selected === 'promissory_note' && (
              <>
                <Section title="Borrower">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Borrower Name" id="borrower_name" value={fields.borrower_name ?? ''} onChange={v => set('borrower_name', v)} placeholder="John Smith" />
                    <Field label="Borrower Address" id="borrower_address" value={fields.borrower_address ?? ''} onChange={v => set('borrower_address', v)} placeholder="123 Main St, City, ST" />
                  </div>
                </Section>
                <Section title="Lender">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Lender Name" id="lender_name" value={fields.lender_name ?? ''} onChange={v => set('lender_name', v)} placeholder="Jane Doe" />
                    <Field label="Lender Address" id="lender_address" value={fields.lender_address ?? ''} onChange={v => set('lender_address', v)} placeholder="456 Oak Ave, City, ST" />
                  </div>
                </Section>
                <Section title="Loan Terms">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Principal Amount ($)" id="principal" value={fields.principal ?? ''} onChange={v => set('principal', v)} placeholder="5000" />
                    <Field label="Interest Rate (% annual, or 0 for none)" id="interest_rate" value={fields.interest_rate ?? ''} onChange={v => set('interest_rate', v)} placeholder="0" />
                    <Field label="Loan Date" id="loan_date" value={fields.loan_date ?? ''} onChange={v => set('loan_date', v)} type="date" />
                    <Field label="Due Date / Repayment Schedule" id="repayment" value={fields.repayment ?? ''} onChange={v => set('repayment', v)} placeholder="Lump sum by 12/31/2026 / $500/month" />
                    <Field label="Governing State" id="governing_state" value={fields.governing_state ?? ''} onChange={v => set('governing_state', v)} placeholder="Texas" />
                  </div>
                </Section>
              </>
            )}

            {selected === 'receipt' && (
              <>
                <Section title="Received By (Payee)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Business / Your Name" id="payee_name" value={fields.payee_name ?? ''} onChange={v => set('payee_name', v)} placeholder="Ace Auto Repair" />
                    <Field label="Phone / Email" id="payee_contact" value={fields.payee_contact ?? ''} onChange={v => set('payee_contact', v)} placeholder="(555) 000-0000" />
                  </div>
                </Section>
                <Section title="Received From (Payer)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Payer Name" id="payer_name" value={fields.payer_name ?? ''} onChange={v => set('payer_name', v)} placeholder="John Smith" />
                    <Field label="Payer Address" id="payer_address" value={fields.payer_address ?? ''} onChange={v => set('payer_address', v)} placeholder="456 Oak Ave, City, ST" />
                  </div>
                </Section>
                <Section title="Payment Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Receipt #" id="receipt_number" value={fields.receipt_number ?? ''} onChange={v => set('receipt_number', v)} placeholder="REC-001" />
                    <Field label="Date" id="receipt_date" value={fields.receipt_date ?? ''} onChange={v => set('receipt_date', v)} type="date" />
                    <Field label="Amount Received ($)" id="amount" value={fields.amount ?? ''} onChange={v => set('amount', v)} placeholder="500" />
                    <Field label="Payment Method" id="payment_method" value={fields.payment_method ?? ''} onChange={v => set('payment_method', v)} placeholder="Cash / Check / Card" />
                    <Field label="Balance Remaining (or Paid in Full)" id="balance" value={fields.balance ?? ''} onChange={v => set('balance', v)} placeholder="Paid in Full / $200 remaining" />
                  </div>
                  <Field label="Description of What Was Paid For" id="description" value={fields.description ?? ''} onChange={v => set('description', v)} placeholder="Oil change, brake pad replacement, labor" rows={2} />
                </Section>
              </>
            )}

            {/* Generate button */}
            <div className="pt-2">
              <button
                onClick={generate}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${accent.btn}`}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating document...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Generate {docMeta?.label}</>
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {html && (
          <div ref={previewRef} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="font-bold text-brand-text">Document Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setHtml(null); setSelected(null) }}
                  className="flex items-center gap-1.5 text-xs text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Start Over
                </button>
                <button
                  onClick={generate}
                  className="flex items-center gap-1.5 text-xs text-brand-sub hover:text-brand-text border border-brand-border rounded-lg px-3 py-1.5 hover:bg-brand-muted transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-red hover:bg-red-500 rounded-lg px-4 py-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
              </div>
            </div>

            {/* White paper preview on dark background */}
            <div className="rounded-2xl border border-brand-border overflow-hidden shadow-2xl">
              <div className="bg-[#f5f5f0] min-h-[500px] p-8">
                <div
                  dangerouslySetInnerHTML={{ __html: html }}
                  className="max-w-[720px] mx-auto"
                />
              </div>
            </div>

            <p className="text-center text-xs text-brand-sub">
              Click <strong className="text-brand-text">Print / Save PDF</strong> → choose &quot;Save as PDF&quot; in your print dialog.
              Want to scan this document for issues?{' '}
              <a href="/" className="text-brand-red hover:underline">Run it through Screwed Score →</a>
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
