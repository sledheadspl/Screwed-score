import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { isValidUUID } from '@/lib/utils'

const RATE_LIMIT     = 3
const RATE_WINDOW_MS = 60 * 60 * 1000   // 1 hour

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const ip     = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? '0.0.0.0'
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16)

    const supabase = createServiceClient()

    // Supabase-backed rate limit check
    const { data: rlData } = await supabase
      .from('rate_limits')
      .select('waitlist_count, waitlist_window_start')
      .eq('ip_hash', ipHash)
      .maybeSingle()

    const now           = new Date()
    const windowExpired = !rlData ||
      now.getTime() - new Date(rlData.waitlist_window_start).getTime() >= RATE_WINDOW_MS

    if (!windowExpired && rlData && rlData.waitlist_count >= RATE_LIMIT) {
      return res.status(429).json({ error: 'Too many requests' })
    }

    const body = req.body

    if (!body.email || typeof body.email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }
    const email = body.email.toLowerCase().trim()
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    const analysisId: string | null =
      body.analysis_id && isValidUUID(body.analysis_id) ? body.analysis_id : null

    const allowedSources = new Set(['result_page', 'share_page', 'landing'])
    const source = allowedSources.has(body.source) ? body.source : 'result_page'

    await supabase.from('waitlist').upsert(
      { email, source, analysis_id: analysisId },
      { onConflict: 'email', ignoreDuplicates: true }
    )

    // Update rate limit counter
    await supabase.from('rate_limits').upsert(
      {
        ip_hash:               ipHash,
        waitlist_count:        windowExpired ? 1 : (rlData!.waitlist_count + 1),
        waitlist_window_start: windowExpired ? now.toISOString() : rlData!.waitlist_window_start,
        updated_at:            now.toISOString(),
      },
      { onConflict: 'ip_hash' }
    )

    // Always return success — don't leak whether the email already existed
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[waitlist] Unhandled error:', err)
    return res.status(500).json({ error: 'Failed to save' })
  }
}
