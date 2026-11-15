import { createServiceClient } from '@/lib/supabase'

export interface WorkerReputation {
  worker_id:         string
  jobs_completed:    number
  jobs_abandoned:    number
  avg_rating:        number
  reputation_score:  number
  disputes_filed:    number
  disputes_lost:     number
  total_earned_cents: number
  last_computed_at:  string
}

export type ReputationTier = 'Elite' | 'Trusted' | 'Unproven' | 'At Risk' | 'Blacklisted'

export function getReputationTier(score: number, isBanned: boolean): ReputationTier {
  if (isBanned)   return 'Blacklisted'
  if (score >= 80) return 'Elite'
  if (score >= 60) return 'Trusted'
  if (score >= 40) return 'Unproven'
  if (score >= 20) return 'At Risk'
  return 'Blacklisted'
}

export function getTierColor(tier: ReputationTier): string {
  if (tier === 'Elite')       return '#30d158'
  if (tier === 'Trusted')     return '#60a5fa'
  if (tier === 'Unproven')    return '#777777'
  if (tier === 'At Risk')     return '#ffd60a'
  return '#ff3b30'
}

export function computeReputationScore(rep: Omit<WorkerReputation, 'reputation_score' | 'last_computed_at' | 'worker_id'>): number {
  let score = 50
  score += rep.jobs_completed * 4
  score += (rep.avg_rating - 3) * 10
  score -= rep.jobs_abandoned * 15
  score -= rep.disputes_lost * 10
  score -= rep.disputes_filed * 2
  return Math.max(0, Math.min(100, Math.round(score)))
}

export async function recomputeWorkerReputation(workerId: string): Promise<WorkerReputation> {
  const supabase = createServiceClient()

  const { data: completions } = await supabase
    .from('job_completions')
    .select('rating, was_on_time')
    .eq('worker_id', workerId)

  const { data: apps } = await supabase
    .from('job_applications')
    .select('status')
    .eq('worker_id', workerId)

  const rows = completions ?? []
  const jobsCompleted = rows.length
  const avgRating = jobsCompleted > 0
    ? rows.reduce((sum, r) => sum + (r.rating ?? 3), 0) / jobsCompleted
    : 0
  const jobsAbandoned = (apps ?? []).filter(a => a.status === 'withdrawn').length

  const partial: Omit<WorkerReputation, 'reputation_score' | 'last_computed_at' | 'worker_id'> = {
    jobs_completed:    jobsCompleted,
    jobs_abandoned:    jobsAbandoned,
    avg_rating:        Math.round(avgRating * 100) / 100,
    disputes_filed:    0,
    disputes_lost:     0,
    total_earned_cents: 0,
  }

  const reputation_score = computeReputationScore(partial)

  const rep: WorkerReputation = {
    worker_id: workerId,
    ...partial,
    reputation_score,
    last_computed_at: new Date().toISOString(),
  }

  await supabase
    .from('worker_reputations')
    .upsert(rep, { onConflict: 'worker_id' })

  // Auto-flag a worker whose score drops below 20 after earning it. The Wall
  // of Shame only holds businesses (each entry must point at a vendor), so a
  // worker goes into worker_flags for the operator to review instead. Only one
  // open system flag per worker, so recomputing doesn't pile up duplicates.
  if (reputation_score < 20 && jobsCompleted >= 3) {
    const { data: openFlag } = await supabase
      .from('worker_flags')
      .select('id')
      .eq('worker_id', workerId)
      .eq('flagged_by', 'system')
      .eq('resolved', false)
      .limit(1)
      .maybeSingle()

    if (!openFlag) {
      const { error: flagError } = await supabase.from('worker_flags').insert({
        worker_id:  workerId,
        job_id:     null,
        flagged_by: 'system',
        reason:     `Reputation score fell to ${reputation_score} after ${jobsCompleted} jobs.`,
        severity:   'high',
      })
      if (flagError) console.error('[workers/reputation] auto-flag failed:', flagError.message)
    }
  }

  return rep
}

export async function getWorkerReputation(workerId: string): Promise<WorkerReputation | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('worker_reputations')
    .select('*')
    .eq('worker_id', workerId)
    .maybeSingle()
  return data as WorkerReputation | null
}
