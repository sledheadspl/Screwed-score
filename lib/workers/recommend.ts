import type { WorkerReputation } from './reputation'

interface ApplicantWithRep {
  worker_id:    string
  reputation:   WorkerReputation | null
  is_banned:    boolean
  min_reputation: number
}

export function rankApplicants<T extends ApplicantWithRep>(applicants: T[]): T[] {
  return applicants
    .filter(a => !a.is_banned && (a.reputation?.reputation_score ?? 50) >= a.min_reputation)
    .sort((a, b) => {
      const scoreA = applicantScore(a.reputation)
      const scoreB = applicantScore(b.reputation)
      return scoreB - scoreA
    })
}

function applicantScore(rep: WorkerReputation | null): number {
  if (!rep) return 25
  return (
    rep.reputation_score              * 0.5 +
    rep.avg_rating * 10               * 0.3 +
    (rep.jobs_completed > 0 ? 20 : 0) * 0.2
  )
}
