import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase'
import type { DocumentType } from '@/lib/types'

export interface BenchmarkData {
  document_type: DocumentType
  total:          number
  avg_percent:    number
  screwed_pct:    number   // % of docs that scored SCREWED
  maybe_pct:      number
  safe_pct:       number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { type } = req.query
  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'type required' })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('analyses')
    .select('screwed_score, screwed_score_percent')
    .eq('document_type', type)
    .eq('is_public', true)

  if (error) return res.status(500).json({ error: 'Query failed' })
  if (!data || data.length < 5) {
    // Not enough data yet to show a meaningful benchmark
    return res.status(200).json({ benchmark: null })
  }

  const total        = data.length
  const screwedCount = data.filter(r => r.screwed_score === 'SCREWED').length
  const maybeCount   = data.filter(r => r.screwed_score === 'MAYBE').length
  const safeCount    = data.filter(r => r.screwed_score === 'SAFE').length
  const avgPercent   = Math.round(data.reduce((sum, r) => sum + r.screwed_score_percent, 0) / total)

  const benchmark: BenchmarkData = {
    document_type: type as DocumentType,
    total,
    avg_percent:  avgPercent,
    screwed_pct:  Math.round((screwedCount / total) * 100),
    maybe_pct:    Math.round((maybeCount  / total) * 100),
    safe_pct:     Math.round((safeCount   / total) * 100),
  }

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  return res.status(200).json({ benchmark })
}
