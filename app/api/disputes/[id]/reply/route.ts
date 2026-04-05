import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { replyToDispute } from '@/lib/disputes/service'

export const runtime = 'nodejs'

interface Params {
  params: { id: string }
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { body: msgBody, is_vendor_rep } = body as Record<string, unknown>
    if (typeof msgBody !== 'string' || !msgBody.trim()) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 })
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

    const message = await replyToDispute(
      id,
      { body: msgBody, is_vendor_rep: is_vendor_rep === true },
      userId
    )

    return NextResponse.json({ message }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    let status = 500
    if (msg === 'Dispute not found') status = 404
    else if (msg === 'Cannot reply to a resolved or closed dispute') status = 409
    return NextResponse.json({ error: msg }, { status })
  }
}
