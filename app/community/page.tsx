import { createServiceClient } from '@/lib/supabase'
import CommunityClient, { type Experience } from '@/components/community/CommunityClient'

// Server-rendered so community stories are in the HTML search engines index.
// Filters and upvotes still run client-side. Rebuilt at most every 5 minutes.
export const revalidate = 300

async function getExperiences(): Promise<Experience[]> {
  try {
    const { data } = await createServiceClient()
      .from('experiences')
      .select('*')
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30)
    return (data ?? []) as Experience[]
  } catch (err) {
    console.error('[community] fetch failed:', err)
    return []
  }
}

export default async function CommunityPage() {
  return <CommunityClient initialExperiences={await getExperiences()} />
}
