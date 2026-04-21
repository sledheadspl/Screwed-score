import { NextRequest, NextResponse } from 'next/server'
import { getJobById, getJobApplications } from '@/lib/jobs/service'
import { rankApplicants } from '@/lib/workers/recommend'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await params
    const job = await getJobById(id)
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Operator sees ranked applicants; public sees only the job
    const secret = req.headers.get('x-operator-secret')
    if (secret && secret === process.env.OWNER_ACCESS_SECRET) {
      const rawApplicants = await getJobApplications(id)
      const applicants = rankApplicants(
        rawApplicants.map((a: Record<string, unknown>) => ({
          ...a,
          worker_id:      a.worker_id as string,
          reputation:     a.worker_reputations as Parameters<typeof rankApplicants>[0][number]['reputation'],
          is_banned:      (a.worker_profiles as Record<string, unknown>)?.is_banned as boolean ?? false,
          min_reputation: job.min_reputation,
        }))
      )
      return NextResponse.json({ job, applicants })
    }

    return NextResponse.json({ job })
  } catch (err) {
    console.error('[api/jobs/[id] GET]', err)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const secret = req.headers.get('x-operator-secret')
  if (!secret || secret !== process.env.OWNER_ACCESS_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { createServiceClient } = await import('@/lib/supabase')
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('jobs')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ job: data })
  } catch (err) {
    console.error('[api/jobs/[id] PATCH]', err)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
