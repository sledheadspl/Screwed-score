import { NextRequest, NextResponse } from 'next/server'
import { completeJob } from '@/lib/jobs/service'
import { recomputeWorkerReputation } from '@/lib/workers/reputation'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const secret = req.headers.get('x-operator-secret')
  if (!secret || secret !== process.env.OWNER_ACCESS_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id: jobId } = await params
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { worker_id, application_id, rating, rating_note, was_on_time } = body as Record<string, unknown>

    if (!worker_id || typeof worker_id !== 'string') return NextResponse.json({ error: 'worker_id required' }, { status: 400 })
    if (!application_id || typeof application_id !== 'string') return NextResponse.json({ error: 'application_id required' }, { status: 400 })
    if (typeof rating !== 'number' || rating < 1 || rating > 5) return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 })

    const completion = await completeJob(
      jobId, worker_id, application_id, rating,
      typeof rating_note === 'string' ? rating_note : undefined,
      typeof was_on_time === 'boolean' ? was_on_time : true
    )

    // Recompute worker reputation asynchronously (non-blocking)
    recomputeWorkerReputation(worker_id).catch(err =>
      console.error('[complete] reputation recompute failed:', err)
    )

    return NextResponse.json({ completion }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to complete job'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
