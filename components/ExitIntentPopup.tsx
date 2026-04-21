'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Mail, ArrowRight, CheckCircle } from 'lucide-react'

const SESSION_KEY = 'gss_guide_seen'

export function ExitIntentPopup() {
  const [visible,   setVisible]   = useState(false)
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [readyTime, setReadyTime] = useState(0)

  // Don't show if already seen this session
  const shouldShow = useCallback(() => {
    try { return !sessionStorage.getItem(SESSION_KEY) } catch { return false }
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
  }, [])

  useEffect(() => {
    if (!shouldShow()) return
    // Minimum 12 seconds on page before eligible to fire
    const t = setTimeout(() => setReadyTime(Date.now()), 12000)
    return () => clearTimeout(t)
  }, [shouldShow])

  // Desktop: mouse leaves toward top of viewport (toward browser bar)
  useEffect(() => {
    if (!shouldShow()) return
    const handleMouseLeave = (e: MouseEvent) => {
      if (!readyTime || Date.now() - readyTime < 0) return
      if (e.clientY <= 10) {
        setVisible(true)
        try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
      }
    }
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [readyTime, shouldShow])

  // Mobile: fire after 60% scroll + 30 seconds, no upload interaction
  useEffect(() => {
    if (!shouldShow()) return
    let fired = false
    const handleScroll = () => {
      if (fired || !readyTime) return
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight)
      if (scrolled > 0.6) {
        fired = true
        setVisible(true)
        try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [readyTime, shouldShow])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/guide', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setDone(true)
      setTimeout(dismiss, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#0d0f18', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-5" style={{ background: 'linear-gradient(135deg, rgba(255,59,48,0.15), rgba(255,107,96,0.05))' }}>
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-brand-sub hover:text-brand-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#ff3b30' }}>Free Guide</p>
          <h2 className="text-lg font-black text-brand-text leading-snug pr-6">
            5 charges on medical bills that hospitals hope you never notice
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {done ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle className="w-10 h-10 mx-auto" style={{ color: '#4ade80' }} />
              <p className="font-bold text-brand-text">Guide sent — check your inbox.</p>
              <p className="text-xs text-brand-sub">Plus a link to scan your own bill for free.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-brand-sub leading-relaxed">
                Upcoding. Unbundling. Phantom charges. The average bill has at least one. We will send you the full breakdown — free.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Mail className="w-4 h-4 flex-shrink-0 text-brand-sub" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 bg-transparent text-sm text-brand-text placeholder:text-brand-sub/40 outline-none"
                  />
                </div>

                {error && <p className="text-xs font-semibold" style={{ color: '#ff6b60' }}>{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)', color: '#fff' }}
                >
                  {loading ? 'Sending…' : (<>Send Me the Free Guide <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>

              <p className="text-center text-[11px] text-brand-sub/40">No spam. One email. Unsubscribe anytime.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
