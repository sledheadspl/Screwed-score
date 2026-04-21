import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { applyForJob, updateApplicationStatus } from '@/lib/jobs/service'

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

// GET — check if current worker has already applied
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id: jobId } = await params
  const workerId = req.nextUrl.searchParams.get('worker_id')
  if (!workerId) return NextResponse.json({ applied: false })

  const { createServiceClient } = await import('@/lib/supabase')
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('job_applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('worker_id', workerId)
    .maybeSingle()

  return NextResponse.json({ applied: !!data })
}

// POST — worker submits application
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const userId = await getAuthUser(req)
  if (!userId) return NextResponse.json({ error: 'Sign in to apply for jobs' }, { status: 401 })

  try {
    const { id: jobId } = await params
    const body = await req.json().catch(() => ({}))
    const application = await applyForJob(jobId, userId, body?.cover_note)
    return NextResponse.json({ application }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to apply'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// PATCH — operator approves or rejects an application
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-operator-secret')
  if (!secret || secret !== process.env.OWNER_ACCESS_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { application_id, status, operator_notes } = body as Record<string, unknown>
    if (!application_id || typeof application_id !== 'string') return NextResponse.json({ error: 'application_id required' }, { status: 400 })
    if (status !== 'approved' && status !== 'rejected') return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })

    const application = await updateApplicationStatus(
      application_id,
      status,
      typeof operator_notes === 'string' ? operator_notes : undefined
    )
    return NextResponse.json({ application })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update application'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
