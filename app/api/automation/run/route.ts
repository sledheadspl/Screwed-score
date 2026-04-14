import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { runAutomationJob } from '@/lib/automation/engine'
import { isAutomationJobType } from '@/lib/types/automation'
import { verifyToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

// Max 20 automation jobs per IP per hour
const LIMIT     = 20
const WINDOW_MS = 60 * 60 * 1000

function getProToken(req: NextRequest): string {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const match = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith('gss_pro='))
  return match ? match.slice('gss_pro='.length) : ''
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Require Pro access
    const proToken = getProToken(req)
    if (!proToken || !verifyToken(proToken)) {
      return NextResponse.json({ error: 'PRO_REQUIRED' }, { status: 403 })
    }

    // Per-IP rate limit
    const ip     = req.headers.get('x-real-ip') ??
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
      '0.0.0.0'
    const ipHash = createHash('sha256').update(`automation:${ip}`).digest('hex')

    try {
      const supabase = createServiceClient()
      const { data } = await supabase
        .from('rate_limits')
        .select('request_count, window_start')
        .eq('ip_hash', ipHash)
        .maybeSingle()

      if (data) {
        const windowAge = Date.now() - new Date(data.window_start).getTime()
        if (windowAge < WINDOW_MS && data.request_count >= LIMIT) {
          return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
        }
      }

      const now          = new Date().toISOString()
      const windowExpired = !data || Date.now() - new Date(data.window_start).getTime() >= WINDOW_MS
      await supabase.from('rate_limits').upsert(
        {
          ip_hash:       ipHash,
          request_count: windowExpired ? 1 : (data!.request_count + 1),
          window_start:  windowExpired ? now : data!.window_start,
          updated_at:    now,
        },
        { onConflict: 'ip_hash' }
      )
    } catch { /* non-fatal */ }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { type, input } = body as { type: unknown; input: unknown }

    if (!isAutomationJobType(type)) {
      return NextResponse.json(
        { error: 'Invalid job type. Must be: text_generation, invoice_analysis, summary, or generic' },
        { status: 400 }
      )
    }

    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return NextResponse.json({ error: 'input must be an object' }, { status: 400 })
    }

    const result = await runAutomationJob(type, input as Record<string, unknown>)

    const statusCode = result.status === 'completed' ? 200 : 500
    return NextResponse.json(result, { status: statusCode })
  } catch (err: unknown) {
    console.error('[automation/run] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
