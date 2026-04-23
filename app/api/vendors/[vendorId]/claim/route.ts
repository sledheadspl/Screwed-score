import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'

interface Params { params: Promise<{ vendorId: string }> }

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { vendorId } = await params

    // Auth required
    const cookieHeader = req.headers.get('cookie') ?? ''
    let userId: string | null = null
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
    } catch { /* no auth */ }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Fetch vendor
    const { data: vendor, error: fetchErr } = await supabase
      .from('vendors')
      .select('id, name, claimed_by')
      .eq('id', vendorId)
      .maybeSingle()

    if (fetchErr || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Already claimed by someone else?
    if (vendor.claimed_by && vendor.claimed_by !== userId) {
      return NextResponse.json({ error: 'This business has already been claimed' }, { status: 409 })
    }

    // Already claimed by this user — idempotent
    if (vendor.claimed_by === userId) {
      return NextResponse.json({ ok: true, vendorId })
    }

    // Claim it
    const { error: updateErr } = await supabase
      .from('vendors')
      .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
      .eq('id', vendorId)

    if (updateErr) throw new Error(updateErr.message)

    return NextResponse.json({ ok: true, vendorId })
  } catch (err) {
    console.error('[vendors/claim]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
