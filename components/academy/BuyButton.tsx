'use client'

import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

/** Starts a Stripe Checkout for an Academy product (see pages/api/product-checkout). */
export function useCheckout(productId: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBuy = async () => {
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
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return { loading, error, handleBuy }
}

export function BuyButton({ productId, label, style, className }: {
  productId: string
  label: string
  style: React.CSSProperties
  className?: string
}) {
  const { loading, error, handleBuy } = useCheckout(productId)

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleBuy}
        disabled={loading}
        className={className ?? 'flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed'}
        style={style}
      >
        {loading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Redirecting…</>) : (<>{label} <ArrowRight className="w-3.5 h-3.5" /></>)}
      </button>
      {error && <p className="text-[11px] text-red-400 max-w-[200px] text-right">{error}</p>}
    </div>
  )
}
