import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase'
import { randomBytes } from 'crypto'

function generateToken(): string {
  return randomBytes(6).toString('base64url') // 8 URL-safe chars
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServiceClient()

  // POST /api/referral — create a referral token
  if (req.method === 'POST') {
    const { analysis_id } = req.body ?? {}

    const token = generateToken()

    const { error } = await supabase
      .from('referral_tokens')
      .insert({
        token,
        referrer_analysis_id: analysis_id ?? null,
        used: false,
      })

    if (error) {
      console.error('[referral] insert error:', error.message)
      return res.status(500).json({ error: 'Could not create referral link' })
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://screwedscore.com'
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
