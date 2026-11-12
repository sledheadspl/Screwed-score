import type { NextApiRequest, NextApiResponse } from 'next'
import { randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { allowRequest, clientIp } from '@/lib/rate-limit'
import { getSessionUserId } from '@/lib/session-user'

function generateToken(): string {
  return randomBytes(16).toString('base64url') // 22 URL-safe chars, ~128 bits entropy
}

// Max 3 referral tokens per signed-in account and per IP per day
const CREATE_LIMIT  = 3
const WINDOW_MS     = 24 * 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServiceClient()

  // POST /api/referral — create a referral token
  if (req.method === 'POST') {
    // Each token is a free-scan bypass, so only signed-in accounts can mint
    // them, and only a few a day.
    const userId = await getSessionUserId(req.headers.cookie)
    if (!userId) {
      return res.status(401).json({ error: 'Sign in to create a referral link' })
    }

    if (
      !(await allowRequest('referral-user', userId, CREATE_LIMIT, WINDOW_MS)) ||
      !(await allowRequest('referral', clientIp(req.headers), CREATE_LIMIT, WINDOW_MS))
    ) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' })
    }

    const { analysis_id } = req.body ?? {}
    const referrerAnalysisId =
      typeof analysis_id === 'string' && analysis_id.length <= 64 ? analysis_id : null

    const token = generateToken()

    const { error } = await supabase
      .from('referral_tokens')
      .insert({
        token,
        referrer_analysis_id: referrerAnalysisId,
        used: false,
      })

    if (error) {
      console.error('[referral] insert error:', error.message)
      return res.status(500).json({ error: 'Could not create referral link' })
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.screwedscore.com'
    return res.status(201).json({ token, url: `${base}/?ref=${token}` })
  }

  // GET /api/referral?token=xxx — validate (does NOT consume)
  if (req.method === 'GET') {
    const token = typeof req.query.token === 'string' ? req.query.token : null
    if (!token) return res.status(400).json({ error: 'Missing token' })

    const { data } = await supabase
      .from('referral_tokens')
      .select('used')
      .eq('token', token)
      .maybeSingle()

    if (!data) return res.status(404).json({ valid: false, reason: 'not_found' })
    if (data.used) return res.status(200).json({ valid: false, reason: 'already_used' })

    return res.status(200).json({ valid: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
