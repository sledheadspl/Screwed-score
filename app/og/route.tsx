import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const score   = searchParams.get('score')    // SCREWED | MAYBE | SAFE
  const percent = searchParams.get('percent')  // 0-100
  const docType = searchParams.get('type')     // e.g. "Medical Bill"
  const rawAmount = parseInt(searchParams.get('amount') ?? '0', 10)
  const amount = isNaN(rawAmount) || rawAmount < 0 ? 0 : rawAmount
  const reason  = searchParams.get('reason') ?? ''

  const isResult = Boolean(score && percent)

  const scoreColor =
    score === 'SCREWED' ? '#f87171' :
    score === 'MAYBE'   ? '#fbbf24' :
    score === 'SAFE'    ? '#4ade80' : '#f87171'

  const scoreBg =
    score === 'SCREWED' ? 'rgba(239,68,68,0.15)' :
    score === 'MAYBE'   ? 'rgba(245,158,11,0.15)' :
    score === 'SAFE'    ? 'rgba(74,222,128,0.15)'  : 'rgba(239,68,68,0.15)'

  const headline =
    !isResult  ? "Find out if you're being overcharged" :
    score === 'SCREWED' && amount > 0 ? `They got charged $${amount.toLocaleString()} they shouldn't have` :
    score === 'SCREWED'               ? `Getting screwed on their ${docType ?? 'document'}` :
    score === 'MAYBE'                 ? `Suspicious charges on their ${docType ?? 'document'}` :
                                        `Clean ${docType ?? 'document'} — no red flags`

  return new ImageResponse(
    (
      <div style={{
        width: '1200px', height: '630px',
        background: '#0d0d0f',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 72px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '48px 48px', display: 'flex',
        }} />

        {/* Glow */}
        <div style={{
          position: 'absolute', top: '-150px', right: '-100px',
          width: '600px', height: '600px', borderRadius: '50%',
          background: isResult
            ? `radial-gradient(circle, ${scoreColor}25 0%, transparent 65%)`
            : 'radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 65%)',
          display: 'flex',
        }} />

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', zIndex: 1 }}>
          <span style={{ fontSize: '26px', fontWeight: 900, color: '#f4f4f5', letterSpacing: '-0.5px' }}>Get</span>
          <span style={{ fontSize: '26px', fontWeight: 900, color: '#f87171', letterSpacing: '-0.5px' }}>Screwed</span>
          <span style={{ fontSize: '26px', fontWeight: 900, color: '#f4f4f5', letterSpacing: '-0.5px' }}>Score</span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 1, flex: 1, justifyContent: 'center' }}>

          {isResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              {/* Score badge */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '12px 32px', borderRadius: '14px',
                background: scoreBg, border: `2px solid ${scoreColor}55`,
              }}>
                <span style={{ fontSize: '38px', fontWeight: 900, color: scoreColor, letterSpacing: '3px' }}>
                  {score}
                </span>
              </div>

              {/* Dollar amount — the hook */}
              {amount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '68px', fontWeight: 900, color: '#f87171', lineHeight: 1, letterSpacing: '-2px' }}>
                    ${amount.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    flagged
                  </span>
                </div>
              )}

              {/* Percent if no dollar amount */}
              {amount === 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '68px', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{percent}</span>
                  <span style={{ fontSize: '30px', fontWeight: 700, color: scoreColor, opacity: 0.6 }}>%</span>
                </div>
              )}
            </div>
          )}

          {/* Headline */}
          <h1 style={{
            fontSize: isResult ? '44px' : '52px',
            fontWeight: 900, color: '#f4f4f5',
            lineHeight: 1.1, letterSpacing: '-1px', margin: 0,
          }}>
            {headline}
          </h1>

          {/* Reason / subtext */}
          <p style={{
            fontSize: '20px',
            color: 'rgba(244,244,245,0.5)',
            margin: 0, lineHeight: 1.4,
            maxWidth: '800px',
          }}>
            {reason || (isResult
              ? `${docType ?? 'Document'} · AI-powered analysis`
              : 'Upload any bill, invoice, or contract. Free. No account needed.'
            )}
          </p>
        </div>

        {/* Bottom strip */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '24px',
        }}>
          <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
            screwedscore.com
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 28px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #ff6b60, #ef4444)',
            boxShadow: '0 0 30px rgba(239,68,68,0.4)',
          }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
              Check yours free →
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // OG images for a given URL never change — cache aggressively at the
        // CDN so every social-media crawler hit doesn't spawn an edge invocation.
        'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400',
      },
    }
  )
}
