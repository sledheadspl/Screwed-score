import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { isValidUUID } from '@/lib/utils'

/** Max 3 waitlist signups per IP per hour — stored in Supabase, survives cold starts. */
const RATE_LIMIT    = 3
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Returns the real client IP.
 * Matches the same logic as the upload route.
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    '0.0.0.0'
  )
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip     = getClientIp(req)
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16)

    const supabase = createServiceClient()

    // ── Rate limiting via DB (survives serverless cold starts) ───────────────
    const waitlistKey = `waitlist:${ipHash}`
    const { data: rateData } = await supabase
      .from('rate_limits')
      .select('analyses_count, window_start')
      .eq('ip_hash', waitlistKey)
      .maybeSingle()

    if (rateData) {
      const windowAge = Date.now() - new Date(rateData.window_start).getTime()
      if (windowAge < RATE_WINDOW_MS && rateData.analyses_count >= RATE_LIMIT) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
      }
    }

    const body = await req.json()

    // ── Validate email ────────────────────────────────────────────────────────
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const email = body.email.toLowerCase().trim()
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // ── Validate optional analysis_id ─────────────────────────────────────────
    const analysisId: string | null =
      body.analysis_id && isValidUUID(body.analysis_id) ? body.analysis_id : null

    // ── Validate optional source — whitelist known values ────────────────────
    const allowedSources = new Set(['result_page', 'share_page', 'landing'])
    const source = allowedSources.has(body.source) ? body.source : 'result_page'

    // ── Upsert waitlist entry ─────────────────────────────────────────────────
    await supabase.from('waitlist').upsert(
      { email, source, analysis_id: analysisId },
      { onConflict: 'email', ignoreDuplicates: true }
    )

    // ── Increment rate limit counter ──────────────────────────────────────────
    const now = new Date().toISOString()
    const windowExpired = !rateData ||
      Date.now() - new Date(rateData.window_start).getTime() >= RATE_WINDOW_MS

    await supabase.from('rate_limits').upsert(
      {
        ip_hash:         waitlistKey,
        analyses_count:  windowExpired ? 1 : (rateData!.analyses_count + 1),
        window_start:    windowExpired ? now : rateData!.window_start,
        updated_at:      now,
      },
      { onConflict: 'ip_hash' }
    )

    // Always return success — don't leak whether email already existed
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[waitlist] Unhandled error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
