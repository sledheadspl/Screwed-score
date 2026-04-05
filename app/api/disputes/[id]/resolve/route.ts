import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { resolveDispute } from '@/lib/disputes/service'

export const runtime = 'nodejs'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { resolution_notes } = body as Record<string, unknown>
    if (typeof resolution_notes !== 'string' || !resolution_notes.trim()) {
      return NextResponse.json({ error: 'resolution_notes is required' }, { status: 400 })
    }

    // Get user from session (optional — in production you'd enforce ownership)
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

    const dispute = await resolveDispute(id, { resolution_notes }, userId)
    return NextResponse.json({ dispute })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    let status = 500
    if (msg === 'Dispute not found') status = 404
    else if (msg === 'Not authorized to resolve this dispute') status = 403
    else if (msg === 'Dispute is already resolved') status = 409
    return NextResponse.json({ error: msg }, { status })
  }
}
