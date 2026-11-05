'use client'

import { useState } from 'react'
import { Loader2, Video, MapPin, Check } from 'lucide-react'
import { LIVE_AUDIT_OPTIONS, formatPrice, type LiveAuditFormat } from '@/lib/live-audit'

const ICONS: Record<LiveAuditFormat, typeof Video> = { video: Video, in_person: MapPin }

const inputClass =
  'w-full rounded-xl bg-black/40 border border-brand-border px-4 py-3 text-sm text-brand-text ' +
  'placeholder:text-brand-sub/40 focus:outline-none focus:border-red-500/60 transition-colors'

export function BookingForm() {
  const [format, setFormat]   = useState<LiveAuditFormat>('video')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/live-audit/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          name:            form.get('name'),
          email:           form.get('email'),
          phone:           form.get('phone'),
          location:        form.get('location'),
          preferred_times: form.get('preferred_times'),
          notes:           form.get('notes'),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const selected = LIVE_AUDIT_OPTIONS[format]

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Format choice */}
      <fieldset className="grid sm:grid-cols-2 gap-3">
        <legend className="sr-only">Choose how to meet</legend>
        {(Object.keys(LIVE_AUDIT_OPTIONS) as LiveAuditFormat[]).map(key => {
          const opt = LIVE_AUDIT_OPTIONS[key]
          const Icon = ICONS[key]
          const active = format === key
          return (
            <label key={key}
              className={`relative cursor-pointer rounded-2xl border p-5 transition-all ${
                active ? 'border-red-500/70 bg-red-500/[0.07]' : 'border-brand-border bg-brand-surface hover:border-brand-sub/30'
              }`}>
              <input type="radio" name="format" value={key} checked={active}
                onChange={() => setFormat(key)} className="sr-only" />
              {active && (
                <span className="absolute top-4 right-4 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
              <Icon className={`w-5 h-5 mb-3 ${active ? 'text-red-400' : 'text-brand-sub'}`} />
              <p className="font-black text-brand-text">{opt.label}</p>
              <p className="mt-1">
                <span className="text-2xl font-black text-brand-text">{formatPrice(opt.priceCents)}</span>
                <span className="text-xs text-brand-sub ml-1.5">{opt.minutes} min</span>
              </p>
              <p className="text-xs text-brand-sub/80 mt-2 leading-relaxed">{opt.summary}</p>
            </label>
          )
        })}
      </fieldset>

      {/* Contact details */}
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="name" required autoComplete="name" placeholder="Your name" className={inputClass} />
        <input name="phone" required type="tel" autoComplete="tel" placeholder="Phone number" className={inputClass} />
        <input name="email" required type="email" autoComplete="email" placeholder="Email" className={`${inputClass} sm:col-span-2`} />
        {format === 'in_person' && (
          <input name="location" required autoComplete="postal-code" placeholder="City or ZIP code" className={`${inputClass} sm:col-span-2`} />
        )}
        <input name="preferred_times" placeholder="Best days & times for you (e.g. weekday evenings)" className={`${inputClass} sm:col-span-2`} />
        <textarea name="notes" rows={3} maxLength={450}
          placeholder="What should we look at? (e.g. a hospital bill, rising phone bill, subscriptions, a contractor quote)"
          className={`${inputClass} sm:col-span-2 resize-none`} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-black text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)', boxShadow: '0 0 40px rgba(255,59,48,0.25)' }}>
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening secure checkout…</>
          : <>Book my {selected.label.toLowerCase()} audit · {formatPrice(selected.priceCents)}</>}
      </button>
      <p className="text-xs text-center text-brand-sub/60">
        Secure payment by Stripe. We&apos;ll contact you within 24 hours to confirm a time that works for you.
      </p>
    </form>
  )
}
