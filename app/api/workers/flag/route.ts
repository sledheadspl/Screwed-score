import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { banWorker } from '@/lib/workers/service'

export const runtime = 'nodejs'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-operator-secret')
  if (!secret || secret !== process.env.OWNER_ACCESS_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { worker_id, job_id, reason, severity } = body as Record<string, unknown>
    if (!worker_id || typeof worker_id !== 'string') return NextResponse.json({ error: 'worker_id required' }, { status: 400 })
    if (!reason || typeof reason !== 'string') return NextResponse.json({ error: 'reason required' }, { status: 400 })

    const supabase = createServiceClient()
    const validSeverity = ['low','medium','high','ban'].includes(String(severity)) ? String(severity) : 'low'

    await supabase.from('worker_flags').insert({
      worker_id,
      job_id:     typeof job_id === 'string' ? job_id : null,
      flagged_by: 'operator',
      reason:     String(reason).trim().slice(0, 500),
      severity:   validSeverity,
    })

    if (validSeverity === 'ban') {
      await banWorker(worker_id, String(reason))
      return NextResponse.json({ ok: true, banned: true })
    }

    return NextResponse.json({ ok: true, banned: false })
  } catch (err) {
    console.error('[api/workers/flag]', err)
    return NextResponse.json({ error: 'Failed to flag worker' }, { status: 500 })
  }
}
