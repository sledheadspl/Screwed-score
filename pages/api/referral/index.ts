import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash, randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase'

function generateToken(): string {
  return randomBytes(16).toString('base64url') // 22 URL-safe chars, ~128 bits entropy
}

// Max 3 referral tokens created per IP per day
const CREATE_LIMIT  = 3
const WINDOW_MS     = 24 * 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServiceClient()

  // POST /api/referral — create a referral token
  if (req.method === 'POST') {
    // Rate limit to prevent unlimited bypass-token generation
    const ip     = (req.headers['x-real-ip'] as string) ??
      (req.headers['cf-connecting-ip'] as string) ??
      (req.headers['x-forwarded-for'] as string)?.split(',').at(-1)?.trim() ??
      '0.0.0.0'
    const ipHash = createHash('sha256').update(`referral:${ip}`).digest('hex')

    try {
      const { data } = await supabase
        .from('rate_limits')
        .select('request_count, window_start')
        .eq('ip_hash', ipHash)
        .maybeSingle()

      if (data) {
        const windowAge = Date.now() - new Date(data.window_start).getTime()
        if (windowAge < WINDOW_MS && data.request_count >= CREATE_LIMIT) {
          return res.status(429).json({ error: 'Too many requests. Try again later.' })
        }
      }

      const now          = new Date().toISOString()
      const windowExpired = !data || Date.now() - new Date(data.window_start).getTime() >= WINDOW_MS
      await supabase.from('rate_limits').upsert(
        {
          ip_hash:       ipHash,
          request_count: windowExpired ? 1 : (data!.request_count + 1),
          window_start:  windowExpired ? now : data!.window_start,
          updated_at:    now,
        },
        { onConflict: 'ip_hash' }
      )
    } catch { /* non-fatal */ }

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
