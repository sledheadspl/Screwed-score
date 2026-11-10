import { listJobs } from '@/lib/jobs/service'
import JobsClient, { type Job } from '@/components/jobs/JobsClient'

// Server-rendered so open gigs are in the HTML search engines index.
// Filters still run client-side. Rebuilt at most every 5 minutes.
export const revalidate = 300

async function getJobs(): Promise<Job[]> {
  try {
    return (await listJobs({ limit: 20 })) as Job[]
  } catch (err) {
    console.error('[jobs] fetch failed:', err)
    return []
  }
}

export default async function JobsPage() {
  return <JobsClient initialJobs={await getJobs()} />
}
