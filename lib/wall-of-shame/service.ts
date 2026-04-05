/**
 * Wall of Shame service
 * Surfaces vendors with the worst track record based on aggregated analysis data.
 * Server-side only.
 */
import { createServiceClient } from '@/lib/supabase'

export interface WallOfShameEntry {
  vendor_id: string
  vendor_name: string
  category: string
  city: string | null
  state: string | null
  total_analyses: number
  screwed_count: number
  screwed_rate: number
  avg_screwed_percent: number
  total_flagged_amount: number
  ai_summary: string | null
}

export interface ListWallOfShameParams {
  category?: string
  state?: string
  limit?: number
  offset?: number
}

export async function listWallOfShame(params: ListWallOfShameParams = {}): Promise<WallOfShameEntry[]> {
  const supabase = createServiceClient()
  const limit = Math.min(params.limit ?? 20, 50)
  const offset = params.offset ?? 0

  let query = supabase
    .from('wall_of_shame_entries')
    .select('*')
    .order('screwed_rate', { ascending: false })
    .order('total_flagged_amount', { ascending: false })
    .range(offset, offset + limit - 1)

  if (params.category) {
    query = query.eq('category', params.category)
  }
  if (params.state) {
    query = query.eq('state', params.state.toUpperCase())
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as WallOfShameEntry[]
}

export async function getWallOfShameEntry(vendorId: string): Promise<WallOfShameEntry | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('wall_of_shame_entries')
    .select('*')
    .eq('vendor_id', vendorId)
    .single()

  if (error || !data) return null
  return data as WallOfShameEntry
}
