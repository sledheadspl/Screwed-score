import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase'
import { createDispute } from '@/lib/disputes/service'
import { DISPUTE_CATEGORIES } from '@/lib/types/disputes'
import type { DisputeCategory } from '@/lib/types/disputes'

export const runtime = 'nodejs'

// Max 5 dispute submissions per IP per hour
const LIMIT     = 5
const WINDOW_MS = 60 * 60 * 1000

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Rate limit by IP
    const ip     = req.headers.get('x-real-ip') ??
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
      '0.0.0.0'
    const ipHash = createHash('sha256').update(`dispute-create:${ip}`).digest('hex')

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

    const { vendor_id, analysis_id, category, title, description, amount_disputed } =
      body as Record<string, unknown>

    if (typeof category !== 'string' || !DISPUTE_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (title.length > 255) {
      return NextResponse.json({ error: 'title too long (max 255 characters)' }, { status: 400 })
    }
    if (typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }
    if (description.length > 2000) {
      return NextResponse.json({ error: 'description too long (max 2000 characters)' }, { status: 400 })
    }

    // Get user from session (optional)
    let userId: string | null = null
    const cookieHeader = req.headers.get('cookie') ?? ''
    try {
      const supabaseAuth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => cookieHeader.split(';').map(c => {
              const [n, ...rest] = c.trim().split('=')
              return { name: n, value: rest.join('=') }
            }),
            setAll: () => {},
          },
        }
      )
      const { data: { user } } = await supabaseAuth.auth.getUser()
      userId = user?.id ?? null
    } catch { /* anon */ }

    const dispute = await createDispute(
      {
        vendor_id: typeof vendor_id === 'string' ? vendor_id : undefined,
        analysis_id: typeof analysis_id === 'string' ? analysis_id : undefined,
        category: category as DisputeCategory,
        title: String(title).trim().slice(0, 255),
        description: String(description).trim().slice(0, 2000),
        amount_disputed: typeof amount_disputed === 'number' ? amount_disputed : undefined,
      },
      userId
    )

    return NextResponse.json({ dispute }, { status: 201 })
  } catch (err: unknown) {
    console.error('[disputes/create] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
