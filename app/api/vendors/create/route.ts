import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase'
import { createVendor } from '@/lib/vendors/service'
import { isVendorCategory } from '@/lib/types/vendors'

export const runtime = 'nodejs'

// Max 10 vendor submissions per IP per hour
const LIMIT     = 10
const WINDOW_MS = 60 * 60 * 1000

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Rate limit by IP
    const ip     = req.headers.get('x-real-ip') ??
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
      '0.0.0.0'
    const ipHash = createHash('sha256').update(`vendor-create:${ip}`).digest('hex')

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

    const { name, category, city, state, zip, website, phone } = body as Record<string, unknown>

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (name.length > 255) {
      return NextResponse.json({ error: 'name too long' }, { status: 400 })
    }
    if (!isVendorCategory(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    // Validate website URL — must be https if provided
    if (website !== undefined && website !== null && website !== '') {
      if (typeof website !== 'string' || !website.startsWith('https://')) {
        return NextResponse.json({ error: 'website must be a valid https URL' }, { status: 400 })
      }
    }

    // Get user from session (optional — anonymous submissions allowed)
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

    const vendor = await createVendor(
      {
        name: String(name).trim().slice(0, 255),
        category,
        city: typeof city === 'string' ? city.slice(0, 100) : undefined,
        state: typeof state === 'string' ? state.slice(0, 2) : undefined,
        zip: typeof zip === 'string' ? zip.slice(0, 10) : undefined,
        website: typeof website === 'string' ? website.slice(0, 500) : undefined,
        phone: typeof phone === 'string' ? phone.slice(0, 30) : undefined,
      },
      userId
    )

    return NextResponse.json({ vendor }, { status: 201 })
  } catch (err: unknown) {
    console.error('[vendors/create] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
