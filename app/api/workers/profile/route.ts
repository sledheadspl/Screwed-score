import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createWorkerProfile, updateWorkerProfile } from '@/lib/workers/service'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

async function getAuthUser(req: NextRequest): Promise<string | null> {
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
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = await getAuthUser(req)
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { display_name, bio, skills, city, state, website } = body as Record<string, unknown>
    if (typeof display_name !== 'string' || !display_name.trim()) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 })
    }

    // Check if profile exists
    const supabase = createServiceClient()
    const { data: existing } = await supabase
      .from('worker_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existing) {
      const profile = await updateWorkerProfile(userId, {
        display_name: String(display_name),
        bio:          typeof bio === 'string' ? bio : undefined,
        skills:       Array.isArray(skills) ? skills.map(String) : [],
        city:         typeof city === 'string' ? city : undefined,
        state:        typeof state === 'string' ? state : undefined,
        website:      typeof website === 'string' ? website : undefined,
      })
      return NextResponse.json({ profile })
    }

    const profile = await createWorkerProfile({
      id:           userId,
      display_name: String(display_name),
      bio:          typeof bio === 'string' ? bio : undefined,
      skills:       Array.isArray(skills) ? skills.map(String) : [],
      city:         typeof city === 'string' ? city : undefined,
      state:        typeof state === 'string' ? state : undefined,
      website:      typeof website === 'string' ? website : undefined,
    })
    return NextResponse.json({ profile }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
