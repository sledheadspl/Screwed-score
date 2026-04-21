import { NextRequest, NextResponse } from 'next/server'
import { getWorkerWithReputation } from '@/lib/workers/service'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await getWorkerWithReputation(id)
    if (!result) return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    const history = (result.completions ?? []).map((c: Record<string, unknown>) => ({
      id:          c.job_id,
      title:       (c.jobs as Record<string, unknown> | null)?.title ?? 'Untitled',
      rating:      c.rating,
      rating_note: c.rating_note,
      completed_at: c.completed_at,
      was_on_time:  c.was_on_time,
    }))
    return NextResponse.json({ id, profile: result.profile, reputation: result.reputation, history })
  } catch (err) {
    console.error('[api/workers/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch worker' }, { status: 500 })
  }
}
