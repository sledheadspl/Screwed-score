import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createVendor } from '@/lib/vendors/service'
import { isVendorCategory } from '@/lib/types/vendors'

export const runtime = 'nodejs'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { name, category, city, state, zip, website, phone } = body as Record<string, unknown>

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!isVendorCategory(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
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
        name: String(name),
        category,
        city: typeof city === 'string' ? city : undefined,
        state: typeof state === 'string' ? state : undefined,
        zip: typeof zip === 'string' ? zip : undefined,
        website: typeof website === 'string' ? website : undefined,
        phone: typeof phone === 'string' ? phone : undefined,
      },
      userId
    )

    return NextResponse.json({ vendor }, { status: 201 })
  } catch (err: unknown) {
    console.error('[vendors/create] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
