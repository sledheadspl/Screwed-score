import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { isValidUUID } from '@/lib/utils'

/** Simple IP-based rate limit: max 3 waitlist signups per IP per hour. */
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000

// In-memory store for waitlist rate limiting (resets on cold start — acceptable for this use case)
const ipCounts = new Map<string, { count: number; resetAt: number }>()

function checkWaitlistRateLimit(ipHash: string): boolean {
  const now = Date.now()
  const entry = ipCounts.get(ipHash)

  if (!entry || now > entry.resetAt) {
    ipCounts.set(ipHash, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16)

    if (!checkWaitlistRateLimit(ipHash)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await req.json()

    // Validate email
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const email = body.email.toLowerCase().trim()
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Validate optional analysis_id
    const analysisId: string | null =
      body.analysis_id && isValidUUID(body.analysis_id) ? body.analysis_id : null

    // Validate optional source — whitelist known values
    const allowedSources = new Set(['result_page', 'share_page', 'landing'])
    const source = allowedSources.has(body.source) ? body.source : 'result_page'

    const supabase = createServiceClient()

    await supabase.from('waitlist').upsert(
      { email, source, analysis_id: analysisId },
      { onConflict: 'email', ignoreDuplicates: true }
    )

    // Always return success — don't leak whether email already existed
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[waitlist] Unhandled error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
