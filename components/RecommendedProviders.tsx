'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, Globe, Phone, ChevronRight, Plus, CheckCircle } from 'lucide-react'

interface Provider {
  id: string
  name: string
  category: string
  city?: string
  state?: string
  website?: string
  phone?: string
  description?: string
  verified: boolean
  trust_score: number
  review_count: number
}

const CATEGORY_LABELS: Record<string, string> = {
  mechanic_invoice:      'Mechanic / Auto Shop',
  medical_bill:          'Medical Provider',
  dental_bill:           'Dental Provider',
  phone_bill:            'Phone / Wireless Carrier',
  internet_bill:         'Internet / Cable Provider',
  contractor_estimate:   'Contractor',
  lease_agreement:       'Landlord / Property Manager',
  insurance_quote:       'Insurance Provider',
  employment_contract:   'Employer',
  service_agreement:     'Service Provider',
  brand_deal:            'Brand / Agency',
  unknown:               'Service Provider',
}

interface Props {
  documentType: string
  score: 'SCREWED' | 'MAYBE' | 'SAFE'
}

export function RecommendedProviders({ documentType, score }: Props) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', city: '', state: '', website: '', phone: '', description: '' })

  useEffect(() => {
    fetch(`/api/providers?category=${documentType}&limit=5`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProviders(data) })
      .catch(() => {})
  }, [documentType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, category: documentType }),
      })
      setSubmitted(true)
      setShowForm(false)
    } catch { /* non-fatal */ }
  }

  const categoryLabel = CATEGORY_LABELS[documentType] ?? 'Service Provider'

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-400" />
          <h3 className="font-bold text-brand-text text-sm">
            {score === 'SAFE' ? `Trusted ${categoryLabel}s` : `Find Someone Better`}
          </h3>
        </div>
        {!showForm && !submitted && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs text-brand-sub hover:text-brand-text transition-colors">
            <Plus className="w-3.5 h-3.5" /> Submit one
          </button>
        )}
      </div>

      {score !== 'SAFE' && (
        <p className="text-xs text-brand-sub">
          Community-vetted {categoryLabel.toLowerCase()}s people actually trust. No overcharges, no BS.
        </p>
      )}

      {providers.length > 0 ? (
        <ul className="space-y-3">
          {providers.map(p => (
            <li key={p.id} className="flex items-start gap-3 p-3 rounded-xl bg-brand-muted border border-brand-border/50">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-brand-text truncate">{p.name}</span>
                  {p.verified && (
                    <span className="shrink-0 text-[10px] font-bold text-green-400 border border-green-500/30 rounded-full px-1.5 py-0.5">VERIFIED</span>
                  )}
                </div>
                {(p.city || p.state) && (
                  <p className="text-xs text-brand-sub">{[p.city, p.state].filter(Boolean).join(', ')}</p>
                )}
                {p.description && (
                  <p className="text-xs text-brand-sub mt-0.5 line-clamp-1">{p.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
                      <Globe className="w-3 h-3" /> Website <ChevronRight className="w-3 h-3" />
                    </a>
                  )}
                  {p.phone && (
                    <a href={`tel:${p.phone}`}
                      className="flex items-center gap-1 text-[11px] text-brand-sub hover:text-brand-text transition-colors">
                      <Phone className="w-3 h-3" /> {p.phone}
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-4 space-y-2">
          <p className="text-xs text-brand-sub">No verified providers yet for this category.</p>
          <p className="text-xs text-brand-sub">Be the first to submit someone you trust.</p>
        </div>
      )}

      {submitted && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>Thanks! We&apos;ll review and add them shortly.</span>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-brand-border">
          <p className="text-xs font-semibold text-brand-text">Submit a trustworthy {categoryLabel.toLowerCase()}</p>
          <input
            required
            placeholder="Business name *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-sub/50 focus:outline-none focus:border-red-500/50"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="City"
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-sub/50 focus:outline-none focus:border-red-500/50"
            />
            <input
              placeholder="State (e.g. WA)"
              maxLength={2}
              value={form.state}
              onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
              className="bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-sub/50 focus:outline-none focus:border-red-500/50"
            />
          </div>
          <input
            placeholder="Website (optional)"
            value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            className="w-full bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-sub/50 focus:outline-none focus:border-red-500/50"
          />
          <input
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-sub/50 focus:outline-none focus:border-red-500/50"
          />
          <textarea
            placeholder="Why do you recommend them? (optional)"
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full bg-brand-muted border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-sub/50 focus:outline-none focus:border-red-500/50 resize-none"
          />
          <div className="flex gap-2">
            <button type="submit"
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              Submit
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm text-brand-sub border border-brand-border hover:bg-brand-muted transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
