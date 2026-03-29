import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyToken } from '@/app/api/verify-checkout/route'
import { isValidUUID, formatDollar } from '@/lib/utils'

const CREATOMATE_API = 'https://api.creatomate.com/v1/renders'

interface VideoRequest {
  analysis_id: string
  hook: string
  on_screen_text: string[]
  caption: string
}

function scoreColor(score: string): string {
  if (score === 'SCREWED') return '#ef4444'
  if (score === 'MAYBE') return '#f59e0b'
  return '#4ade80'
}

function scoreEmoji(score: string): string {
  if (score === 'SCREWED') return '🚨'
  if (score === 'MAYBE') return '⚠️'
  return '✅'
}

function buildComposition(
  hook: string,
  overlays: string[],
  score: string,
  percent: number,
  reason: string,
  flaggedAmount: number,
  flaggedItems: Array<{ description: string; charged_amount: number | null; flag_reason?: string | null }>,
  docLabel: string,
): object {
  const color = scoreColor(score)
  const emoji = scoreEmoji(score)
  const amountText = flaggedAmount > 0 ? formatDollar(flaggedAmount) + ' flagged' : `${percent}% screwed`

  // Build flagged item text blocks (up to 3, shown at 9s+)
  const itemElements = flaggedItems.slice(0, 3).map((item, i) => ({
    type: 'text',
    track: 5 + i,
    time: 9 + i * 1.8,
    duration: 19 - i * 1.8,
    text: `${item.description}${item.charged_amount != null ? ' — $' + item.charged_amount.toFixed(0) : ''}`,
    font_family: 'Montserrat',
    font_weight: '700',
    font_size: 38,
    fill_color: '#f4f4f5',
    width: '82%',
    x_alignment: '50%',
    y_alignment: `${56 + i * 9}%`,
    animations: [
      {
        time: 'start',
        duration: 0.4,
        type: 'slide',
        direction: '270°',
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    ],
  }))

  return {
    output_format: 'mp4',
    width: 1080,
    height: 1920,
    frame_rate: 30,
    duration: 28,
    elements: [
      // Dark background
      {
        type: 'shape',
        track: 1,
        width: '100%',
        height: '100%',
        fill_color: '#0d0d0f',
      },

      // Subtle top gradient glow
      {
        type: 'shape',
        track: 1,
        shape: 'ellipse',
        width: '140%',
        height: '40%',
        x_alignment: '50%',
        y: '-10%',
        fill_color: color + '18',
      },

      // ── HOOK segment (0–4.5s) ──
      {
        type: 'text',
        track: 2,
        time: 0.3,
        duration: 4.2,
        text: hook,
        font_family: 'Montserrat',
        font_weight: '900',
        font_size: 72,
        fill_color: '#ffffff',
        width: '82%',
        x_alignment: '50%',
        y_alignment: '42%',
        line_height: '110%',
        animations: [
          {
            time: 'start',
            duration: 0.6,
            type: 'scale',
            fade: true,
            start_scale: '75%',
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          },
          {
            time: 'end',
            duration: 0.4,
            type: 'fade',
            easing: 'linear',
          },
        ],
      },

      // Swipe hint at bottom during hook
      {
        type: 'text',
        track: 2,
        time: 1.5,
        duration: 3,
        text: 'wait for it...',
        font_family: 'Montserrat',
        font_weight: '600',
        font_size: 38,
        fill_color: '#71717a',
        x_alignment: '50%',
        y_alignment: '80%',
        animations: [
          { time: 'start', duration: 0.5, type: 'fade' },
          { time: 'end', duration: 0.4, type: 'fade' },
        ],
      },

      // ── REVEAL segment (4.5–9s) ──

      // Score badge
      {
        type: 'text',
        track: 3,
        time: 4.5,
        duration: 23.5,
        text: `${emoji} ${score}`,
        font_family: 'Montserrat',
        font_weight: '900',
        font_size: 58,
        fill_color: color,
        x_alignment: '50%',
        y_alignment: '22%',
        animations: [
          { time: 'start', duration: 0.5, type: 'scale', fade: true, start_scale: '60%', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
        ],
      },

      // Amount flagged (big red number)
      {
        type: 'text',
        track: 4,
        time: 5.2,
        duration: 22.8,
        text: amountText,
        font_family: 'Montserrat',
        font_weight: '900',
        font_size: 96,
        fill_color: '#ef4444',
        x_alignment: '50%',
        y_alignment: '34%',
        line_height: '105%',
        animations: [
          { time: 'start', duration: 0.6, type: 'scale', fade: true, start_scale: '70%', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        ],
      },

      // Doc type label
      {
        type: 'text',
        track: 4,
        time: 5.8,
        duration: 22.2,
        text: docLabel.toUpperCase(),
        font_family: 'Montserrat',
        font_weight: '700',
        font_size: 34,
        fill_color: '#71717a',
        x_alignment: '50%',
        y_alignment: '44%',
        letter_spacing: '0.15em',
        animations: [
          { time: 'start', duration: 0.4, type: 'fade' },
        ],
      },

      // Divider line
      {
        type: 'shape',
        track: 4,
        time: 6.5,
        duration: 21.5,
        width: '60%',
        height: 2,
        fill_color: '#27272a',
        x_alignment: '50%',
        y_alignment: '49%',
        animations: [
          { time: 'start', duration: 0.4, type: 'wipe', direction: '90°' },
        ],
      },

      // "What they got charged for" label
      {
        type: 'text',
        track: 4,
        time: 7,
        duration: 21,
        text: 'WHAT THEY GOT CHARGED FOR',
        font_family: 'Montserrat',
        font_weight: '700',
        font_size: 30,
        fill_color: '#52525b',
        x_alignment: '50%',
        y_alignment: '52%',
        letter_spacing: '0.1em',
        animations: [
          { time: 'start', duration: 0.4, type: 'fade' },
        ],
      },

      // ── Flagged line items (9s–28s) ──
      ...itemElements,

      // ── CTA segment (22s–28s) ──
      {
        type: 'shape',
        track: 8,
        time: 21.5,
        duration: 6.5,
        width: '100%',
        height: '32%',
        y_alignment: '100%',
        fill_color: '#0d0d0f',
      },

      {
        type: 'text',
        track: 9,
        time: 22,
        duration: 6,
        text: 'CHECK YOURS FREE',
        font_family: 'Montserrat',
        font_weight: '900',
        font_size: 72,
        fill_color: '#ffffff',
        x_alignment: '50%',
        y_alignment: '78%',
        animations: [
          { time: 'start', duration: 0.5, type: 'slide', direction: '270°', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        ],
      },
      {
        type: 'text',
        track: 9,
        time: 22.5,
        duration: 5.5,
        text: 'GetScrewedScore.com',
        font_family: 'Montserrat',
        font_weight: '700',
        font_size: 44,
        fill_color: '#ef4444',
        x_alignment: '50%',
        y_alignment: '88%',
        animations: [
          { time: 'start', duration: 0.4, type: 'fade' },
        ],
      },

      // Watermark (small, always visible)
      {
        type: 'text',
        track: 10,
        time: 0,
        duration: 28,
        text: 'GetScrewedScore.com',
        font_family: 'Montserrat',
        font_weight: '600',
        font_size: 26,
        fill_color: '#3f3f46',
        x_alignment: '50%',
        y_alignment: '97%',
      },
    ],
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Pro gate
  const proToken = req.cookies.get('gss_pro')?.value
  if (!proToken || !verifyToken(proToken)) {
    return NextResponse.json({ error: 'PRO_REQUIRED' }, { status: 403 })
  }

  if (!process.env.CREATOMATE_API_KEY) {
    return NextResponse.json({ error: 'Video generation not configured' }, { status: 503 })
  }

  const body: VideoRequest = await req.json()
  const { analysis_id, hook, on_screen_text } = body

  if (!analysis_id || !isValidUUID(analysis_id)) {
    return NextResponse.json({ error: 'Invalid analysis_id' }, { status: 400 })
  }
  if (!hook || typeof hook !== 'string') {
    return NextResponse.json({ error: 'Missing hook' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: analysis, error } = await supabase
    .from('analyses')
    .select('screwed_score, screwed_score_percent, screwed_score_reason, document_type, overcharge_output')
    .eq('id', analysis_id)
    .maybeSingle()

  if (error || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
  }

  const flaggedItems = (analysis.overcharge_output?.line_items ?? [])
    .filter((i: { flagged: boolean }) => i.flagged)
    .slice(0, 3) as Array<{ description: string; charged_amount: number | null; flag_reason?: string | null }>

  const flaggedAmount: number = analysis.overcharge_output?.total_flagged_amount ?? 0
  const docLabel = (analysis.document_type ?? 'document').replace(/_/g, ' ')

  const source = buildComposition(
    hook.trim(),
    Array.isArray(on_screen_text) ? on_screen_text : [],
    analysis.screwed_score,
    analysis.screwed_score_percent,
    analysis.screwed_score_reason,
    flaggedAmount,
    flaggedItems,
    docLabel,
  )

  const response = await fetch(CREATOMATE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
    },
    body: JSON.stringify({ source }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => `HTTP ${response.status}`)
    console.error('[generate-video] Creatomate error:', errText)
    return NextResponse.json({ error: 'Video render failed' }, { status: 502 })
  }

  const renders = await response.json()
  // Creatomate returns an array
  const render = Array.isArray(renders) ? renders[0] : renders

  return NextResponse.json({ render_id: render.id, status: render.status })
}
