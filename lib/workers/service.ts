import { createServiceClient } from '@/lib/supabase'
import { recomputeWorkerReputation } from './reputation'

export interface WorkerProfile {
  id:           string
  display_name: string
  bio:          string | null
  skills:       string[]
  availability: string
  city:         string | null
  state:        string | null
  website:      string | null
  is_verified:  boolean
  is_banned:    boolean
  ban_reason:   string | null
  created_at:   string
  updated_at:   string
}

export interface CreateWorkerProfileInput {
  id:           string
  display_name: string
  bio?:         string
  skills?:      string[]
  city?:        string
  state?:       string
  website?:     string
}

export async function createWorkerProfile(input: CreateWorkerProfileInput): Promise<WorkerProfile> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('worker_profiles')
    .insert({
      id:           input.id,
      display_name: input.display_name.trim().slice(0, 80),
      bio:          input.bio?.trim().slice(0, 500) ?? null,
      skills:       input.skills ?? [],
      city:         input.city?.trim().slice(0, 50) ?? null,
      state:        input.state?.trim().slice(0, 2).toUpperCase() ?? null,
      website:      input.website?.trim() ?? null,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create worker profile')

  // Seed reputation row
  await supabase.from('worker_reputations').upsert({ worker_id: input.id }, { onConflict: 'worker_id', ignoreDuplicates: true })

  return data as WorkerProfile
}

export async function updateWorkerProfile(
  workerId: string,
  updates: Partial<Omit<WorkerProfile, 'id' | 'created_at' | 'is_verified' | 'is_banned' | 'ban_reason'>>
): Promise<WorkerProfile> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('worker_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', workerId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update worker profile')
  return data as WorkerProfile
}

export async function getWorkerWithReputation(workerId: string) {
  const supabase = createServiceClient()

  const [{ data: profile }, { data: reputation }, { data: completions }] = await Promise.all([
    supabase.from('worker_profiles').select('*').eq('id', workerId).maybeSingle(),
    supabase.from('worker_reputations').select('*').eq('worker_id', workerId).maybeSingle(),
    supabase.from('job_completions')
      .select('rating, rating_note, completed_at, was_on_time, job_id, jobs(title, category)')
      .eq('worker_id', workerId)
      .order('completed_at', { ascending: false })
      .limit(10),
  ])

  if (!profile) return null
  return { profile: profile as WorkerProfile, reputation, completions: completions ?? [] }
}

export async function banWorker(workerId: string, reason: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('worker_profiles')
    .update({ is_banned: true, ban_reason: reason.trim().slice(0, 500), updated_at: new Date().toISOString() })
    .eq('id', workerId)

  // Trigger wall of shame
  await recomputeWorkerReputation(workerId)

}
