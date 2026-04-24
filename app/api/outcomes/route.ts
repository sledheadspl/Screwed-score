import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isValidUUID } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_OUTCOMES = new Set(['won', 'partial', 'lost', 'pending'])

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('outcomes')
    .select('outcome, recovered')

  if (error) {
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const rows = data ?? []
  const total_recovered = rows.reduce((sum, o) => sum + (o.recovered ?? 0), 0)
  const total_reports = rows.length
  const total_wins = rows.filter(o => o.outcome === 'won' || o.outcome === 'partial').length

  return NextResponse.json(
    { total_recovered, total_reports, total_wins },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate' } }
  )
}

export async function POST(req: Request) {
  let body: { analysis_id?: string; outcome?: string; recovered?: number | string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { analysis_id, outcome, recovered } = body

  if (!analysis_id || !isValidUUID(analysis_id)) {
    return NextResponse.json({ error: 'Invalid analysis_id' }, { status: 400 })
  }
  if (!outcome || !VALID_OUTCOMES.has(outcome)) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
  }

  const raw = parseInt(String(recovered ?? '0'), 10)
  const recoveredAmount = Number.isFinite(raw) ? Math.max(0, Math.min(100000, raw)) : 0

  const supabase = createServiceClient()
  const { data: analysis } = await supabase
    .from('analyses')
    .select('id')
    .eq('id', analysis_id)
    .eq('is_public', true)
    .maybeSingle()

  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('outcomes')
    .upsert(
      { analysis_id, outcome, recovered: recoveredAmount },
      { onConflict: 'analysis_id' }
    )

  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  return NextResponse.json({ success: true })
}
