import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('worker_reputations')
      .select('*, worker_profiles(display_name, skills, city, state, is_verified, is_banned, availability)')
      .order('reputation_score', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)
    const filtered = (data ?? []).filter((r: Record<string, unknown>) => !(r.worker_profiles as Record<string, unknown>)?.is_banned)
    return NextResponse.json(filtered)
  } catch (err) {
    console.error('[api/workers/leaderboard]', err)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
