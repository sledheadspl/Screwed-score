import { NextRequest, NextResponse } from 'next/server'
import { isOperatorRequest } from '@/lib/secure-compare'
import { createServerClient } from '@supabase/ssr'
import { applyForJob, updateApplicationStatus } from '@/lib/jobs/service'

export const runtime = 'nodejs'

// Messages thrown by applyForJob that are meant for the applicant.
const APPLY_USER_ERRORS = new Set([
  'Job is not accepting applications',
  'Job has reached maximum applicants',
  'You have already applied for this job',
])

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
    // Pass through the service's own eligibility messages; anything else
    // (database errors and the like) stays in the server log.
    const message = err instanceof Error ? err.message : ''
    if (APPLY_USER_ERRORS.has(message) || /^Minimum reputation score of \d+ required$/.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('[api/jobs/[id]/apply POST]', err)
    return NextResponse.json({ error: 'Failed to apply' }, { status: 400 })
  }
}

// PATCH — operator approves or rejects an application
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (!isOperatorRequest(req.headers)) {
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
    console.error('[api/jobs/[id]/apply PATCH]', err)
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
  }
}
