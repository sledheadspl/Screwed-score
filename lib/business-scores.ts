import { createServiceClient } from '@/lib/supabase'

export interface BusinessScore {
  id: string
  business_name: string
  business_slug: string
  category: string
  city?: string
  state?: string
  screwed_count: number
  maybe_count: number
  safe_count: number
  total_count: number
  screwed_percent: number
  total_flagged_dollars: number
}


export interface ShameData {
  shame:  BusinessScore[]
  honor:  BusinessScore[]
  stats:  { total_reports: number; total_flagged: number; businesses: number }
}

const EMPTY: ShameData = { shame: [], honor: [], stats: { total_reports: 0, total_flagged: 0, businesses: 0 } }

/** Same queries as GET /api/business-scores, run on the server so the lists are in the HTML Google indexes. */
export async function getShameData(limit = 20): Promise<ShameData> {
  try {
    const supabase = createServiceClient()
    const [statsRes, shameRes, honorRes] = await Promise.all([
      supabase.from('business_scores').select('total_count, total_flagged_dollars'),
      supabase.from('business_scores').select('*').gte('total_count', 1)
        .order('screwed_percent', { ascending: false }).order('total_count', { ascending: false }).limit(limit),
      supabase.from('business_scores').select('*').gte('total_count', 1)
        .order('screwed_percent', { ascending: true }).order('total_count', { ascending: false }).limit(limit),
    ])
    const all = statsRes.data ?? []
    return {
      shame: (shameRes.data ?? []) as BusinessScore[],
      honor: (honorRes.data ?? []) as BusinessScore[],
      stats: {
        total_reports: all.reduce((s, b) => s + (b.total_count ?? 0), 0),
        total_flagged: all.reduce((s, b) => s + (b.total_flagged_dollars ?? 0), 0),
        businesses:    all.length,
      },
    }
  } catch (err) {
    console.error('[shame] data fetch failed:', err)
    return EMPTY
  }
}
