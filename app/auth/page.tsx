'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthClient } from '@/lib/auth-client'
import { Zap } from 'lucide-react'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const router              = useRouter()
  const [mode, setMode]     = useState<Mode>('signin')
  const [email, setEmail]   = useState('')
  const [pass,  setPass]    = useState('')
  const [name,  setName]    = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoad]  = useState(false)
  const [sent,  setSent]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoad(true)

    const supabase = getAuthClient()

    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Display name is required'); setLoad(false); return }
        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password: pass })
        if (signUpErr) throw signUpErr
        if (data.user) {
          await fetch('/api/workers/profile', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ display_name: name.trim() }),
          })
          setSent(true)
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (signInErr) throw signInErr
        router.push('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoad(false)
    }
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#020308' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">📬</div>
          <h2 className="text-xl font-black text-brand-text">Check your email</h2>
          <p className="text-sm text-brand-sub">
            We sent a confirmation link to <strong className="text-brand-text">{email}</strong>.
            Click it to activate your account, then sign in.
          </p>
          <button
            onClick={() => { setSent(false); setMode('signin') }}
            className="text-xs text-brand-sub underline underline-offset-2 opacity-60 hover:opacity-100"
          >
            Back to sign in
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#020308' }}>
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-brand-red" />
            <span className="text-lg font-black text-brand-text tracking-tight">ScrewedScore</span>
          </div>
          <h1 className="text-2xl font-black text-brand-text">
            {mode === 'signin' ? 'Welcome back' : 'Join the community'}
          </h1>
          <p className="text-sm text-brand-sub mt-1">
            {mode === 'signin' ? 'Sign in to apply for gigs' : 'Create your worker account'}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-brand-sub mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="How you appear on your profile"
                  required
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-sub/40 outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-brand-sub mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-sub/40 outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-sub mb-1.5">Password</label>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="········"
                required
                minLength={6}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-sub/40 outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {error && (
              <p className="text-xs font-semibold" style={{ color: '#ff6b60' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 mt-1"
              style={{
                background: 'linear-gradient(135deg, rgba(0,229,255,0.18), rgba(0,229,255,0.08))',
                border:     '1px solid rgba(0,229,255,0.3)',
                color:      '#00e5ff',
              }}
            >
              {loading ? '…' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>
        </div>

        {/* Toggle */}
        <p className="text-center text-xs text-brand-sub">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
            className="font-bold underline underline-offset-2"
            style={{ color: '#00e5ff' }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </main>
  )
}
