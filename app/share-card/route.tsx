import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const SCORE_COLOR  = { SCREWED: '#f87171', MAYBE: '#fbbf24', SAFE: '#4ade80' }
const SCORE_BG     = { SCREWED: 'rgba(239,68,68,0.18)',  MAYBE: 'rgba(245,158,11,0.18)', SAFE: 'rgba(74,222,128,0.18)' }
const SCORE_GLOW   = { SCREWED: 'rgba(239,68,68,0.35)',  MAYBE: 'rgba(245,158,11,0.30)', SAFE: 'rgba(74,222,128,0.28)' }
const SCORE_EMOJI  = { SCREWED: '🚨', MAYBE: '⚠️', SAFE: '✅' }
const SCORE_TAG    = { SCREWED: 'They were trying it.', MAYBE: 'Worth a closer look.', SAFE: 'Looks clean. Nice.' }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const score   = (searchParams.get('score')   ?? 'SCREWED') as keyof typeof SCORE_COLOR
  const percent = parseInt(searchParams.get('percent') ?? '0', 10)
  const docType = searchParams.get('type')   ?? 'Document'
  const amount  = parseInt(searchParams.get('amount') ?? '0', 10)
  const finding1 = searchParams.get('f1') ?? ''
  const finding2 = searchParams.get('f2') ?? ''

  const safeScore = ['SCREWED','MAYBE','SAFE'].includes(score) ? score : 'SCREWED'
  const color  = SCORE_COLOR[safeScore]
  const bg     = SCORE_BG[safeScore]
  const glow   = SCORE_GLOW[safeScore]
  const emoji  = SCORE_EMOJI[safeScore]
  const tagline = SCORE_TAG[safeScore]
  const barWidth = Math.min(100, Math.max(0, percent))

  return new ImageResponse(
    (
      <div style={{
        width: '1080px', height: '1080px',
        background: '#09090b',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
          backgroundSize: '54px 54px', display: 'flex',
        }} />

        {/* Radial glow — top-right */}
        <div style={{
          position: 'absolute', top: '-220px', right: '-160px',
          width: '780px', height: '780px', borderRadius: '50%',
          background: `radial-gradient(circle, ${glow} 0%, transparent 65%)`,
          display: 'flex',
        }} />

        {/* Bottom-left glow */}
        <div style={{
          position: 'absolute', bottom: '-200px', left: '-150px',
          width: '600px', height: '600px', borderRadius: '50%',
          background: `radial-gradient(circle, ${glow.replace('0.35','0.12').replace('0.30','0.10').replace('0.28','0.09')} 0%, transparent 65%)`,
          display: 'flex',
        }} />

        {/* ── Content container ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', flex: 1,
          padding: '64px 72px 56px', position: 'relative', zIndex: 1,
          justifyContent: 'space-between',
        }}>

          {/* ── Header row ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Wordmark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#e4e4e7', letterSpacing: '-0.5px' }}>Get</span>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#f87171', letterSpacing: '-0.5px' }}>Screwed</span>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#e4e4e7', letterSpacing: '-0.5px' }}>Score</span>
            </div>
            {/* Doc type pill */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '8px 20px', borderRadius: '100px',
              background: `${bg}`, border: `1px solid ${color}44`,
            }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color, letterSpacing: '0.2px' }}>{docType}</span>
            </div>
          </div>

          {/* ── Verdict block ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* Score + Amount row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '32px' }}>
              {/* Score verdict */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase' }}>
                  verdict
                </span>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '20px 40px', borderRadius: '20px',
                  background: bg,
                  border: `2px solid ${color}55`,
                  boxShadow: `0 0 60px ${glow}`,
                }}>
                  <span style={{ fontSize: '28px' }}>{emoji}</span>
                  <span style={{
                    fontSize: '64px', fontWeight: 900, color,
                    letterSpacing: '4px', lineHeight: 1,
                  }}>{safeScore}</span>
                </div>
              </div>

              {/* Dollar amount — the hook */}
              {amount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
                    flagged
                  </span>
                  <span style={{
                    fontSize: '88px', fontWeight: 900, color: '#f87171',
                    lineHeight: 1, letterSpacing: '-3px',
                    filter: 'drop-shadow(0 0 30px rgba(248,113,113,0.5))',
                  }}>
                    ${amount.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Percent if no dollar */}
              {amount === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
                    risk level
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{
                      fontSize: '88px', fontWeight: 900, color,
                      lineHeight: 1, letterSpacing: '-3px',
                    }}>{percent}</span>
                    <span style={{ fontSize: '44px', fontWeight: 800, color, opacity: 0.6, paddingBottom: '8px' }}>%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Risk bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>Risk level</span>
                <span style={{ fontSize: '14px', fontWeight: 800, color }}>{percent}%</span>
              </div>
              {/* Track */}
              <div style={{ height: '10px', width: '100%', background: 'rgba(255,255,255,0.07)', borderRadius: '100px', display: 'flex', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${barWidth}%`,
                  background: safeScore === 'SCREWED'
                    ? 'linear-gradient(90deg, #b91c1c, #ef4444, #f87171)'
                    : safeScore === 'MAYBE'
                    ? 'linear-gradient(90deg, #b45309, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, #166534, #16a34a, #4ade80)',
                  borderRadius: '100px',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Safe</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Screwed</span>
              </div>
            </div>

            {/* Findings */}
            {(finding1 || finding2) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[finding1, finding2].filter(Boolean).map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: bg, border: `1.5px solid ${color}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: '2px',
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, color }}>!</span>
                    </div>
                    <span style={{
                      fontSize: '18px', color: 'rgba(255,255,255,0.65)',
                      lineHeight: 1.4, fontWeight: 500,
                    }}>{f.length > 90 ? f.slice(0, 88) + '…' : f}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tagline */}
            <p style={{
              fontSize: '20px', color: 'rgba(255,255,255,0.35)', margin: 0, fontWeight: 500,
            }}>{tagline}</p>
          </div>

          {/* ── Footer ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '28px',
          }}>
            <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.5px' }}>
              screwedscore.com
            </span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 32px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #ff6b60 0%, #ef4444 100%)',
              boxShadow: '0 0 40px rgba(239,68,68,0.45)',
            }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '0.3px' }}>
                Check yours free →
              </span>
            </div>
          </div>

        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  )
}
