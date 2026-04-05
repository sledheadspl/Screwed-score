'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'

function PaidInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')

  useEffect(() => {
    const sessionId = params?.get('session_id')
    if (!sessionId) { router.replace('/'); return }

    fetch('/api/verify-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setStatus('success')
          setTimeout(() => router.replace('/'), 2500)
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [params, router])

  return (
    <div className="text-center space-y-4 max-w-sm">
      {status === 'verifying' && (
        <>
          <Loader2 className="w-10 h-10 text-brand-sub animate-spin mx-auto" />
          <p className="text-brand-sub">Activating your Pro access…</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-brand-text">Scan Unlocked!</h1>
          <p className="text-brand-sub">Your analysis is ready. Redirecting…</p>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="text-red-400 font-semibold">Something went wrong verifying your payment.</p>
          <p className="text-brand-sub text-sm">Your card was not charged. <a href="/" className="underline">Go back</a>.</p>
        </>
      )}
    </div>
  )
}

export default function PaidPage() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <Suspense fallback={<Loader2 className="w-10 h-10 text-brand-sub animate-spin" />}>
        <PaidInner />
      </Suspense>
    </div>
  )
}
