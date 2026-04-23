'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuthClient } from '@/lib/auth-client'
import { Zap, ShieldCheck } from 'lucide-react'

type Mode = 'signin' | 'signup'

function AuthForm() {
  const router              = useRouter()
  const searchParams        = useSearchParams()
  const role                = searchParams?.get('role')
  const isBusiness          = role === 'business'
  const initialMode         = searchParams?.get('mode') === 'signup' ? 'signup' : 'signin'

  const [mode, setMode]     = useState<Mode>(initialMode)
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
        if (!isBusiness && !name.trim()) { setError('Display name is required'); setLoad(false); return }
        if (isBusiness && !name.trim()) { setError('Business name is required'); setLoad(false); return }

        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password: pass })
        if (signUpErr) throw signUpErr

        if (data.user) {
          if (!isBusiness) {
            // Workers: create worker profile
            await fetch('/api/workers/profile', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ display_name: name.trim() }),
            })
          }
          setSent(true)
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (signInErr) throw signInErr
        router.push(isBusiness ? '/business-portal' : '/')
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

  const accentStyle = isBusiness
    ? { background: 'linear-gradient(135deg, rgba(74,222,128,0.18), rgba(74,222,128,0.08))', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }
    : { background: 'linear-gradient(135deg, rgba(0,229,255,0.18), rgba(0,229,255,0.08))', border: '1px solid rgba(0,229,255,0.3)',   color: '#00e5ff' }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#020308' }}>
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {isBusiness
              ? <ShieldCheck className="w-5 h-5" style={{ color: '#4ade80' }} />
              : <Zap className="w-5 h-5 text-brand-red" />
            }
            <span className="text-lg font-black text-brand-text tracking-tight">ScrewedScore</span>
          </div>
          <h1 className="text-2xl font-black text-brand-text">
            {mode === 'signin'
              ? (isBusiness ? 'Business portal sign in' : 'Welcome back')
              : (isBusiness ? 'Claim your business profile' : 'Join the community')}
          </h1>
          <p className="text-sm text-brand-sub mt-1">
            {mode === 'signin'
              ? (isBusiness ? 'Sign in to manage your profile' : 'Sign in to apply for gigs')
              : (isBusiness ? 'Get verified as an honest business' : 'Create your worker account')}
          </p>
        </div>

        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-brand-sub mb-1.5">
                  {isBusiness ? 'Your Name' : 'Display Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={isBusiness ? 'Your name (not your business name)' : 'How you appear on your profile'}
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
                placeholder={isBusiness ? 'owner@yourbusiness.com' : 'you@example.com'}
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

            {error && <p className="text-xs font-semibold" style={{ color: '#ff6b60' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 mt-1"
              style={accentStyle}
            >
              {loading ? '…' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-brand-sub">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
            className="font-bold underline underline-offset-2"
            style={isBusiness ? { color: '#4ade80' } : { color: '#00e5ff' }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {isBusiness && (
          <p className="text-center text-xs text-brand-sub opacity-50">
            Looking to apply for gigs? <a href="/auth" className="underline">Worker sign-in →</a>
          </p>
        )}
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
