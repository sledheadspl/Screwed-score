import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'
import type { DocumentType } from '@/lib/types'

export interface TickerItem {
  score:   'SCREWED' | 'MAYBE' | 'SAFE'
  doc:     string
  amount:  string
  minsAgo: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('analyses')
    .select('document_type, screwed_score, overcharge_output, created_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(40)

  const items: TickerItem[] = (data ?? []).map(row => {
    const flagged = (row.overcharge_output as { total_flagged_amount?: number } | null)?.total_flagged_amount ?? 0
    const minsAgo = Math.round((Date.now() - new Date(row.created_at).getTime()) / 60000)
    return {
      score:   row.screwed_score as TickerItem['score'],
      doc:     DOCUMENT_TYPE_LABELS[row.document_type as DocumentType] ?? row.document_type,
      amount:  flagged > 0 ? `$${Math.round(flagged).toLocaleString()}` : '',
      minsAgo: Math.max(0, minsAgo),
    }
  })

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
  return res.status(200).json(items)
}
