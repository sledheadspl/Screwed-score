'use client'

import { useState, FormEvent } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'

const INDUSTRIES = [
  'Restaurant / Bar',
  'Auto Repair',
  'Contractor / Trades',
  'Dental Practice',
  'Medical Practice',
  'Retail / Shop',
  'Salon / Spa',
  'Gym / Fitness',
  'Professional Services',
  'Other',
]

type Status = 'idle' | 'submitting' | 'ok' | 'error'

export default function LeadForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('submitting')
    setErrMsg('')

    const fd = new FormData(e.currentTarget)
    const payload = {
      name:         (fd.get('name') as string ?? '').trim(),
      business:     (fd.get('business') as string ?? '').trim(),
      email:        (fd.get('email') as string ?? '').trim(),
      phone:        (fd.get('phone') as string ?? '').trim(),
      industry:     (fd.get('industry') as string ?? '').trim(),
      monthly_bills:(fd.get('monthly_bills') as string ?? '').trim(),
      message:      (fd.get('message') as string ?? '').trim(),
    }

    if (!payload.name || !payload.business || !payload.email) {
      setStatus('error')
      setErrMsg('Name, business, and email are required.')
      return
    }

    try {
      const res = await fetch('/api/business-audit/lead', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStatus('error')
        setErrMsg(data?.error ?? 'Could not submit. Try again or email sledheadspl@gmail.com.')
        return
      }
      setStatus('ok')
    } catch {
      setStatus('error')
      setErrMsg('Network error. Try again or email sledheadspl@gmail.com.')
    }
  }

  if (status === 'ok') {
    const paymentLink = process.env.NEXT_PUBLIC_BUSINESS_AUDIT_PAYMENT_LINK
    return (
      <div
        id="lead-form"
        className="rounded-2xl p-8 text-center space-y-5"
        style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}
      >
        <CheckCircle className="w-12 h-12 mx-auto" style={{ color: '#4ade80' }} />
        <h3 className="text-2xl font-black text-brand-text">Got it.</h3>
        <p className="text-sm text-brand-sub max-w-sm mx-auto leading-relaxed">
          We&apos;ll review your info and reach out within 24 hours to confirm scope and send the
          payment link. Check your inbox for a confirmation.
        </p>
        {paymentLink && (
          <div className="pt-3 space-y-3">
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: '#4ade80' }}>
              Or skip the wait
            </p>
            <a
              href={paymentLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3 text-sm font-black transition-all"
              style={{ background: 'linear-gradient(135deg, #4ade80, #16a34a)', color: '#000' }}
            >
              Pay $497 now &amp; lock in 48hr turnaround →
            </a>
            <p className="text-[11px] text-brand-sub/70">Money-back if identified savings &lt; $1,500/yr.</p>
          </div>
        )}
      </div>
    )
  }

  const inputCls =
    'w-full rounded-xl px-4 py-3 text-sm text-brand-text placeholder:text-brand-sub/50 outline-none transition-colors focus:border-[#4ade80]/60'
  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  }

  return (
    <form
      id="lead-form"
      onSubmit={onSubmit}
      className="rounded-2xl p-6 sm:p-8 space-y-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <h3 className="text-xl font-black text-brand-text">Get a free first look</h3>
      <p className="text-sm text-brand-sub leading-relaxed">
        Fill this out and we&apos;ll review your bills before you pay anything. If we don&apos;t see at
        least $1,500/yr in identified savings, we won&apos;t pitch you the audit.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <input name="name" placeholder="Your name" required className={inputCls} style={inputStyle} />
        <input name="business" placeholder="Business name" required className={inputCls} style={inputStyle} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input name="email" type="email" placeholder="Email" required className={inputCls} style={inputStyle} />
        <input name="phone" type="tel" placeholder="Phone (optional)" className={inputCls} style={inputStyle} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <select name="industry" required className={inputCls} style={inputStyle} defaultValue="">
          <option value="" disabled>Industry</option>
          {INDUSTRIES.map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <input
          name="monthly_bills"
          placeholder="Approx monthly bill spend (optional)"
          className={inputCls}
          style={inputStyle}
        />
      </div>

      <textarea
        name="message"
        rows={3}
        placeholder="Anything we should know? (optional)"
        className={`${inputCls} resize-none`}
        style={inputStyle}
      />

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-black transition-all disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #4ade80, #16a34a)', color: '#000' }}
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Sending…
          </>
        ) : (
          <>Request my free first look →</>
        )}
      </button>

      {status === 'error' && (
        <p className="text-xs font-semibold text-center" style={{ color: '#ff3b30' }}>{errMsg}</p>
      )}

      <p className="text-[11px] text-brand-sub/70 text-center">
        We never share your info. By submitting you agree to be contacted by ScrewedScore about your bill audit.
      </p>
    </form>
  )
}
