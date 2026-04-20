'use client'

import { useState, useCallback } from 'react'

// ── Game logic ────────────────────────────────────────────────────────────────

function ri(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getWeightedScore(): number {
  const r = Math.random() * 100
  if (r < 5)  return ri(0, 10)
  if (r < 25) return ri(11, 30)
  if (r < 60) return ri(31, 60)
  if (r < 90) return ri(61, 85)
  if (r < 98) return ri(86, 95)
  return ri(96, 100)
}

function getTier(s: number) {
  if (s <= 10) return { letter: 'S', label: 'Untouchable' }
  if (s <= 30) return { letter: 'A', label: 'Barely Holding It Together' }
  if (s <= 60) return { letter: 'B', label: 'Functional Disaster' }
  if (s <= 75) return { letter: 'C', label: 'Walking Red Flag' }
  if (s <= 90) return { letter: 'D', label: 'Catastrophic Human' }
  return { letter: 'F', label: 'Final Boss of Bad Decisions' }
}

function getArchetype(s: number) {
  if (s <= 10) return 'The Untouchable'
  if (s <= 30) return 'The Lucky Idiot'
  if (s <= 60) return 'The Functional Disaster'
  if (s <= 75) return 'The Walking Red Flag'
  if (s <= 90) return 'The Chaotic Gambler'
  return 'The Final Boss of Bad Decisions'
}

function getRoast(s: number) {
  if (s <= 10) return "You're basically immortal. Nothing can touch you."
  if (s <= 30) return "You're skating by on pure luck and bad decisions."
  if (s <= 60) return "Mildly screwed. Manageable if you stop self-sabotaging."
  if (s <= 75) return "Oh yeah, you're cooked. This absolutely tracks."
  if (s <= 90) return "Catastrophic levels of chaos. People worry about you."
  return "You are a walking cautionary tale. Future generations will study you."
}

function getPercentile(s: number) {
  if (s <= 10) return ri(1, 20)
  if (s <= 30) return ri(20, 50)
  if (s <= 60) return ri(40, 70)
  if (s <= 75) return ri(60, 85)
  if (s <= 90) return ri(80, 95)
  return ri(90, 99)
}

const CAPTIONS = [
  'This explains everything.',
  'My life is a speedrun.',
  'Send help.',
  'I did NOT need this today.',
  'Screenshot and ruin a friend\'s day.',
  'Therapy won\'t fix this.',
  'Yeah, that feels accurate.',
  'The math is mathing.',
  'Completely on brand.',
  'Not surprised. Disappointed, but not surprised.',
]

function getCaption() {
  return CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)]
}

function getTierColor(letter: string): string {
  if (letter === 'S') return '#00f5ff'
  if (letter === 'A') return '#4ade80'
  if (letter === 'B') return '#facc15'
  if (letter === 'C') return '#f97316'
  if (letter === 'D') return '#f87171'
  return '#ff00e5'
}

// ── Component ─────────────────────────────────────────────────────────────────

interface GameResult {
  score: number
  tier: { letter: string; label: string }
  archetype: string
  roast: string
  percentile: number
  caption: string
}

export function ScrewedScoreGame() {
  const [result, setResult] = useState<GameResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  const roll = useCallback(() => {
    const score = getWeightedScore()
    setResult({
      score,
      tier: getTier(score),
      archetype: getArchetype(score),
      roast: getRoast(score),
      percentile: getPercentile(score),
      caption: getCaption(),
    })
    setAnimKey(k => k + 1)
    setCopied(false)
  }, [])

  const shareResult = useCallback(async () => {
    if (!result) return
    const msg = `My ScrewedScore is ${result.score}/100 — ${result.tier.letter} Tier (${result.archetype}). I'm more screwed than ${result.percentile}% of people. Can you beat that? https://screwedscore.com/score`
    try {
      await navigator.clipboard.writeText(msg)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback: do nothing silently
    }
  }, [result])

  const tierColor = result ? getTierColor(result.tier.letter) : '#00f5ff'

  return (
    <section className="animate-fade-up max-w-6xl mx-auto px-5 sm:px-8 pb-24">
      <div className="text-center space-y-2 mb-10">
        <p className="text-[11px] font-bold text-brand-sub/35 uppercase tracking-[0.25em]">Take a break</p>
        <h2 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">How screwed are you, really?</h2>
        <p className="text-sm text-brand-sub/50 max-w-sm mx-auto">Not your bills — just you, as a person. Tap once to find out.</p>
      </div>

      <div className="max-w-sm mx-auto">
        {/* CTA button — pre-roll */}
        {!result && (
          <button
            onClick={roll}
            className="w-full py-5 rounded-2xl font-black text-lg tracking-tight transition-all duration-200 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(0,245,255,0.1), rgba(0,245,255,0.04))',
              border: '1.5px solid rgba(0,245,255,0.35)',
              color: '#00f5ff',
              boxShadow: '0 0 40px rgba(0,245,255,0.08)',
            }}
          >
            Tap to See How Screwed You Are
          </button>
        )}

        {/* Result card */}
        {result && (
          <div
            key={animKey}
            style={{
              background: '#080b14',
              border: `1.5px solid ${tierColor}40`,
              borderRadius: '20px',
              boxShadow: `0 0 60px ${tierColor}12, inset 0 1px 0 ${tierColor}10`,
              animation: 'gssCardin 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            <style>{`
              @keyframes gssCardin {
                from { opacity: 0; transform: scale(0.92) translateY(12px); }
                to   { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>

            <div className="p-7 text-center">
              {/* Brand */}
              <p className="text-[10px] font-black tracking-[0.25em] uppercase mb-5"
                style={{ color: `${tierColor}70` }}>
                ScrewedScore · Official Reading
              </p>

              {/* Score */}
              <p className="font-black leading-none mb-1"
                style={{ fontSize: 'clamp(72px, 22vw, 96px)', letterSpacing: '-0.04em', color: tierColor, textShadow: `0 0 40px ${tierColor}60` }}>
                {result.score}
              </p>

              {/* Tier */}
              <p className="text-sm font-black tracking-[0.15em] uppercase mb-0.5"
                style={{ color: '#ff00e5', textShadow: '0 0 20px rgba(255,0,229,0.5)' }}>
                {result.tier.letter} Tier
              </p>
              <p className="text-[11px] mb-5" style={{ color: '#6b7a99', letterSpacing: '0.08em' }}>
                {result.tier.label}
              </p>

              {/* Divider */}
              <div className="my-4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tierColor}25, transparent)` }} />

              {/* Archetype + percentile */}
              <p className="text-base font-bold mb-2" style={{ color: '#f0f4ff' }}>{result.archetype}</p>
              <p className="text-sm mb-3" style={{ color: '#6b7a99' }}>
                More screwed than <span style={{ color: tierColor, fontWeight: 800 }}>{result.percentile}%</span> of people
              </p>
              <p className="text-[13px] italic leading-relaxed mb-4 px-2" style={{ color: 'rgba(240,244,255,0.65)' }}>
                {result.roast}
              </p>

              {/* Divider */}
              <div className="my-4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tierColor}25, transparent)` }} />

              <p className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: 'rgba(107,122,153,0.55)' }}>
                {result.caption}
              </p>
            </div>

            {/* Actions */}
            <div className="px-5 pb-6 flex flex-col gap-2.5">
              <button
                onClick={roll}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-150 active:scale-97"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f4ff' }}
              >
                ↺ Try Again
              </button>
              <button
                onClick={shareResult}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-150 active:scale-97"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,0,229,0.1), rgba(255,0,229,0.04))',
                  border: '1.5px solid rgba(255,0,229,0.3)',
                  color: '#ff00e5',
                }}
              >
                {copied ? '✓ Copied to clipboard!' : '⚡ Challenge a Friend'}
              </button>
            </div>
          </div>
        )}

        {/* Link to full game */}
        <p className="text-center mt-4 text-[11px]" style={{ color: 'rgba(107,122,153,0.45)' }}>
          <a href="/score" style={{ color: 'rgba(0,245,255,0.4)', textDecoration: 'none' }}
            onMouseOver={e => (e.currentTarget.style.color = '#00f5ff')}
            onMouseOut={e => (e.currentTarget.style.color = 'rgba(0,245,255,0.4)')}>
            Full game with tiers, archetypes &amp; daily forecast →
          </a>
        </p>
      </div>
    </section>
  )
}
