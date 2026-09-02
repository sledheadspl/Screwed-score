'use client'

import { useEffect, useRef } from 'react'
import { ADSENSE_CLIENT_ID } from '@/lib/adsense'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

type AdUnitProps = {
  /** Ad unit slot ID from the AdSense dashboard (Ads → By ad unit). */
  slot: string
  /** Defaults to a responsive unit that fills its container. */
  format?: string
  /** Set false for fixed-height units that shouldn't reshape on narrow screens. */
  responsive?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * A single AdSense display unit. Renders nothing when
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID is unset, so previews and local dev stay clean.
 */
export default function AdUnit({
  slot,
  format = 'auto',
  responsive = true,
  className,
  style,
}: AdUnitProps) {
  const pushed = useRef(false)

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // AdSense script blocked or not loaded yet — nothing to recover from.
    }
  }, [])

  if (!ADSENSE_CLIENT_ID) return null

  return (
    <ins
      className={`adsbygoogle${className ? ` ${className}` : ''}`}
      style={{ display: 'block', ...style }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  )
}
