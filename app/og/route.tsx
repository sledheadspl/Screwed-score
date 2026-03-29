import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const score     = searchParams.get('score')     // SCREWED | MAYBE | SAFE
  const percent   = searchParams.get('percent')   // 0-100
  const docType   = searchParams.get('type')      // e.g. "Medical Bill"
  const headline  = searchParams.get('headline')  // custom override

  const isResult = Boolean(score && percent)

  // ── Colour palette ──────────────────────────────────────────────────────────
  const scoreColor =
    score === 'SCREWED' ? '#f87171' :
    score === 'MAYBE'   ? '#fbbf24' :
    score === 'SAFE'    ? '#4ade80' :
    '#f87171'

  const scoreBg =
    score === 'SCREWED' ? 'rgba(239,68,68,0.12)' :
    score === 'MAYBE'   ? 'rgba(245,158,11,0.12)' :
    score === 'SAFE'    ? 'rgba(74,222,128,0.12)'  :
    'rgba(239,68,68,0.12)'

  const displayHeadline =
    headline ??
    (isResult
      ? `Your ${docType ?? 'document'} scored ${percent}% screwed`
      : 'Find out if you\'re being overcharged')

  const subtext = isResult
    ? score === 'SCREWED' ? 'You\'re getting screwed. See the full breakdown.'
    : score === 'MAYBE'   ? 'Some red flags found. See the full breakdown.'
    :                       'You\'re in the clear. See what we checked.'
    : 'Upload any bill, invoice, or contract. AI-powered overcharge detection — free.'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0d0d0f',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          display: 'flex',
        }} />

        {/* Glow blob */}
        <div style={{
          position: 'absolute',
          top: '-120px', right: '-80px',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: isResult ? `radial-gradient(circle, ${scoreColor}22 0%, transparent 70%)` : 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Top: Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', zIndex: 1 }}>
          <span style={{ fontSize: '28px', fontWeight: 900, color: '#f4f4f5', letterSpacing: '-0.5px' }}>Get</span>
          <span style={{ fontSize: '28px', fontWeight: 900, color: '#f87171', letterSpacing: '-0.5px' }}>Screwed</span>
          <span style={{ fontSize: '28px', fontWeight: 900, color: '#f4f4f5', letterSpacing: '-0.5px' }}>Score</span>
        </div>

        {/* Middle: Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 1, flex: 1, justifyContent: 'center' }}>

          {isResult && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
            }}>
              {/* Score badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 28px',
                borderRadius: '12px',
                background: scoreBg,
                border: `1px solid ${scoreColor}44`,
              }}>
                <span style={{ fontSize: '36px', fontWeight: 900, color: scoreColor, letterSpacing: '2px' }}>
                  {score}
                </span>
              </div>

              {/* Percent */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '72px', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{percent}</span>
                <span style={{ fontSize: '32px', fontWeight: 700, color: scoreColor, opacity: 0.7 }}>%</span>
              </div>

              {/* Gauge bar */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{
                  height: '12px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  display: 'flex',
                }}>
                  <div style={{
                    width: `${percent}%`,
                    height: '100%',
                    borderRadius: '999px',
                    background: `linear-gradient(90deg, ${scoreColor}88, ${scoreColor})`,
                  }} />
                </div>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Screwed Score</span>
              </div>
            </div>
          )}

          <h1 style={{
            fontSize: isResult ? '42px' : '56px',
            fontWeight: 900,
            color: '#f4f4f5',
            lineHeight: 1.1,
            letterSpacing: '-1px',
            margin: 0,
          }}>
            {displayHeadline}
          </h1>

          <p style={{
            fontSize: '22px',
            color: 'rgba(244,244,245,0.55)',
            margin: 0,
            lineHeight: 1.4,
          }}>
            {subtext}
          </p>
        </div>

        {/* Bottom: CTA strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '24px',
        }}>
          <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
            getscrewedscore.com
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            borderRadius: '10px',
            background: '#ef4444',
          }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
              Check your document free →
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
