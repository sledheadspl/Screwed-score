'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

const LiveTickerImpl      = dynamic(() => import('@/components/LiveTicker').then(m => m.LiveTicker),           { ssr: false })
const VictoryBannerImpl   = dynamic(() => import('@/components/VictoryBanner').then(m => m.VictoryBanner),     { ssr: false })
const ScrewedScoreGameImpl = dynamic(() => import('@/components/ScrewedScoreGame').then(m => m.ScrewedScoreGame), { ssr: false })

/**
 * Renders `children` only once the placeholder is close to the viewport.
 *
 * These widgets all sit below a full-height hero and each one fetches on mount.
 * Loading them eagerly put their code and their network calls in front of the
 * hero on mobile; behind an IntersectionObserver they cost nothing until the
 * visitor actually scrolls down.
 */
function WhenNear({ children, minHeight }: { children: ReactNode; minHeight: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setShow(true); return }

    let frame = 0

    // True once the placeholder has reached the load line — including when the
    // viewport has already moved past it, so scrolling back up finds content.
    const near = () => el.getBoundingClientRect().top < window.innerHeight + 400

    const reveal = () => {
      setShow(true)
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }

    // Backstop for jumps — an anchor link or a programmatic scrollTo can move
    // straight past the placeholder without the observer ever seeing it
    // intersect, since the intersection ratio never leaves 0.
    function onScroll() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => { if (near()) reveal() })
    }

    const io = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) reveal() },
      { rootMargin: '400px' }
    )
    io.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  // The placeholder reserves height so nothing shifts when the real widget lands.
  return <div ref={ref} style={show ? undefined : { minHeight }}>{show ? children : null}</div>
}

export function DeferredLiveTicker() {
  return <WhenNear minHeight={56}><LiveTickerImpl /></WhenNear>
}

export function DeferredVictoryBanner() {
  return <WhenNear minHeight={64}><VictoryBannerImpl /></WhenNear>
}

export function DeferredScrewedScoreGame() {
  return <WhenNear minHeight={420}><ScrewedScoreGameImpl /></WhenNear>
}
