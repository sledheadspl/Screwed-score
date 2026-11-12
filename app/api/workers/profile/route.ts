import { NextRequest, NextResponse } from 'next/server'
import { createWorkerProfile, updateWorkerProfile } from '@/lib/workers/service'
import { createServiceClient } from '@/lib/supabase'
import { getSessionUserId } from '@/lib/session-user'
import { toHttpUrl } from '@/lib/safe-url'

export const runtime = 'nodejs'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId(req.headers.get('cookie'))
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { display_name, bio, skills, city, state, website } = body as Record<string, unknown>
    if (typeof display_name !== 'string' || !display_name.trim()) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 })
    }

    // Website must be a plain http(s) URL (no javascript:, data: etc.).
    // Empty clears it; leaving it out keeps the current value.
    let safeWebsite: string | null | undefined = undefined
    if (website === null || (typeof website === 'string' && website.trim() === '')) {
      safeWebsite = null
    } else if (website !== undefined) {
      const url = toHttpUrl(website)
      if (!url || url.length > 500) {
        return NextResponse.json({ error: 'website must be an http or https URL' }, { status: 400 })
      }
      safeWebsite = url
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
        ...(safeWebsite !== undefined ? { website: safeWebsite } : {}),
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
      website:      safeWebsite ?? undefined,
    })
    return NextResponse.json({ profile }, { status: 201 })
  } catch (err: unknown) {
    console.error('[api/workers/profile]', err)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
