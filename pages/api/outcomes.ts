import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase'
import { isValidUUID } from '@/lib/utils'

const VALID_OUTCOMES = new Set(['won', 'partial', 'lost', 'pending'])

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServiceClient()

  // GET — aggregated community stats
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('outcomes')
      .select('outcome, recovered')

    if (error) return res.status(500).json({ error: 'Query failed' })

    const rows = data ?? []
    const total_recovered = rows.reduce((sum, o) => sum + (o.recovered ?? 0), 0)
    const total_reports   = rows.length
    const total_wins      = rows.filter(o => o.outcome === 'won' || o.outcome === 'partial').length

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
    return res.status(200).json({ total_recovered, total_reports, total_wins })
  }

  // POST — submit an outcome for an analysis
  if (req.method === 'POST') {
    const { analysis_id, outcome, recovered } = req.body ?? {}

    if (!analysis_id || !isValidUUID(analysis_id)) {
      return res.status(400).json({ error: 'Invalid analysis_id' })
    }
    if (!VALID_OUTCOMES.has(outcome)) {
      return res.status(400).json({ error: 'Invalid outcome' })
    }

    const raw = parseInt(recovered ?? '0', 10)
    const recoveredAmount = Number.isFinite(raw) ? Math.max(0, Math.min(100000, raw)) : 0

    // Verify the analysis exists and is public before accepting an outcome
    const { data: analysis } = await supabase
      .from('analyses')
      .select('id')
      .eq('id', analysis_id)
      .eq('is_public', true)
      .maybeSingle()

    if (!analysis) return res.status(404).json({ error: 'Analysis not found' })

    const { error } = await supabase
      .from('outcomes')
      .upsert(
        { analysis_id, outcome, recovered: recoveredAmount },
        { onConflict: 'analysis_id' }
      )

    if (error) return res.status(500).json({ error: 'Failed to save' })
    return res.status(200).json({ success: true })
  }

  return res.status(405).end()
}
