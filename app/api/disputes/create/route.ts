import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createDispute } from '@/lib/disputes/service'
import { DISPUTE_CATEGORIES } from '@/lib/types/disputes'
import type { DisputeCategory } from '@/lib/types/disputes'

export const runtime = 'nodejs'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { vendor_id, analysis_id, category, title, description, amount_disputed } =
      body as Record<string, unknown>

    if (!DISPUTE_CATEGORIES.has(category as string)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
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
        title: String(title),
        description: String(description),
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
