'use client'

import { useState } from 'react'
import { Crown, Loader2 } from 'lucide-react'

interface Props {
  productId: string
  label: string
  highlight: boolean
}

export default function CheckoutButton({ productId, label, highlight }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (productId === 'free') {
      window.location.href = '#download'
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/product-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Something went wrong.')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
          highlight ? 'text-black' : 'text-brand-text border border-brand-border hover:bg-brand-muted'
        }`}
        style={highlight ? {
          background: 'linear-gradient(135deg, #67e8f9, #00E5FF)',
          boxShadow: '0 0 30px rgba(0,229,255,0.2)',
        } : {}}
      >
        {loading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Redirecting…</>
        ) : (
          <>{productId !== 'free' && <Crown className="w-3.5 h-3.5" />}{label}</>
        )}
      </button>
    </div>
  )
}
