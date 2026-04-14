import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { issueToken } from '@/lib/auth'

const OWNER_SECRET = process.env.OWNER_ACCESS_SECRET

// Max 5 attempts per IP per hour — brute-force protection
const LIMIT      = 5
const WINDOW_MS  = 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit by IP before checking the secret
  const ip     = (req.headers['x-real-ip'] as string) ??
    (req.headers['cf-connecting-ip'] as string) ??
    (req.headers['x-forwarded-for'] as string)?.split(',').at(-1)?.trim() ??
    '0.0.0.0'
  const ipHash = createHash('sha256').update(`owner:${ip}`).digest('hex')

  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('ip_hash', ipHash)
      .maybeSingle()

    if (data) {
      const windowAge = Date.now() - new Date(data.window_start).getTime()
      if (windowAge < WINDOW_MS && data.request_count >= LIMIT) {
        return res.status(429).json({ error: 'Too many attempts. Try again later.' })
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
  } catch { /* non-fatal — don't expose DB errors */ }

  // Read secret from POST body — never from query string (avoids URL logging)
  const { secret } = req.body as { secret?: string }
  if (!OWNER_SECRET || secret !== OWNER_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const token = issueToken('owner', 'owner_access', 365)

  res.setHeader(
    'Set-Cookie',
    `gss_pro=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 365}`
  )
  res.redirect(302, '/')
}
