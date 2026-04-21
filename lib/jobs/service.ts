import { createServiceClient } from '@/lib/supabase'

export const JOB_CATEGORIES = new Set(['writing','design','outreach','research','dev','video','admin','other'])

export interface Job {
  id:              string
  title:           string
  description:     string
  category:        string
  skills_required: string[]
  pay_description: string | null
  location_type:   string
  city:            string | null
  state:           string | null
  status:          string
  min_reputation:  number
  max_applicants:  number
  posted_by:       string
  created_at:      string
  updated_at:      string
}

export interface CreateJobInput {
  title:           string
  description:     string
  category:        string
  skills_required?: string[]
  pay_description?: string
  location_type?:  string
  city?:           string
  state?:          string
  min_reputation?: number
  max_applicants?: number
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      title:           input.title.trim().slice(0, 150),
      description:     input.description.trim().slice(0, 4000),
      category:        input.category,
      skills_required: input.skills_required ?? [],
      pay_description: input.pay_description?.trim().slice(0, 100) ?? null,
      location_type:   input.location_type ?? 'remote',
      city:            input.city?.trim().slice(0, 50) ?? null,
      state:           input.state?.trim().slice(0, 2).toUpperCase() ?? null,
      min_reputation:  input.min_reputation ?? 0,
      max_applicants:  input.max_applicants ?? 20,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create job')
  return data as Job
}

export async function listJobs(filters: {
  category?: string
  location_type?: string
  status?: string
  limit?: number
  offset?: number
}) {
  const supabase = createServiceClient()

  let query = supabase
    .from('jobs')
    .select('*, job_applications(count)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 20)

  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 20) - 1)
  if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category)
  if (filters.location_type && filters.location_type !== 'all') query = query.eq('location_type', filters.location_type)
  query = query.eq('status', filters.status ?? 'open')

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getJobById(id: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as Job | null
}

export async function applyForJob(jobId: string, workerId: string, coverNote?: string) {
  const supabase = createServiceClient()

  // Check job exists and is open
  const { data: job } = await supabase
    .from('jobs')
    .select('status, max_applicants, min_reputation')
    .eq('id', jobId)
    .single()

  if (!job || job.status !== 'open') throw new Error('Job is not accepting applications')

  // Check worker reputation meets minimum
  if (job.min_reputation > 0) {
    const { data: rep } = await supabase
      .from('worker_reputations')
      .select('reputation_score')
      .eq('worker_id', workerId)
      .maybeSingle()

    if (!rep || rep.reputation_score < job.min_reputation) {
      throw new Error(`Minimum reputation score of ${job.min_reputation} required`)
    }
  }

  // Check applicant count
  const { count } = await supabase
    .from('job_applications')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', jobId)

  if ((count ?? 0) >= job.max_applicants) throw new Error('Job has reached maximum applicants')

  const { data, error } = await supabase
    .from('job_applications')
    .insert({ job_id: jobId, worker_id: workerId, cover_note: coverNote?.trim().slice(0, 1000) ?? null })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('You have already applied for this job')
    throw new Error(error.message)
  }
  return data
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'approved' | 'rejected',
  operatorNotes?: string
) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('job_applications')
    .update({ status, operator_notes: operatorNotes?.trim() ?? null, updated_at: new Date().toISOString() })
    .eq('id', applicationId)
    .select()
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to update application')
  return data
}

export async function completeJob(
  jobId: string,
  workerId: string,
  applicationId: string,
  rating: number,
  ratingNote?: string,
  wasOnTime?: boolean
) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('job_completions')
    .insert({
      job_id:         jobId,
      worker_id:      workerId,
      application_id: applicationId,
      rating:         Math.max(1, Math.min(5, rating)),
      rating_note:    ratingNote?.trim().slice(0, 500) ?? null,
      was_on_time:    wasOnTime ?? true,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to record completion')

  // Mark job filled
  await supabase.from('jobs').update({ status: 'filled', updated_at: new Date().toISOString() }).eq('id', jobId)

  // Mark application approved
  await supabase.from('job_applications').update({ status: 'approved' }).eq('id', applicationId)

  return data
}

export async function getJobApplications(jobId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('job_applications')
    .select('*, worker_profiles(display_name, skills, city, state, is_verified, is_banned), worker_reputations(reputation_score, jobs_completed, avg_rating)')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })
  return data ?? []
}
