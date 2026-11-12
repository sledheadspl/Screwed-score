import type { NextApiRequest, NextApiResponse } from 'next'
import { issueToken } from '@/lib/auth'
import { allowRequest, clientIp } from '@/lib/rate-limit'
import { secretMatches } from '@/lib/secure-compare'

const OWNER_SECRET = process.env.OWNER_ACCESS_SECRET

// Max 5 attempts per IP per hour — brute-force protection
const LIMIT      = 5
const WINDOW_MS  = 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit by IP before checking the secret. clientIp prefers Netlify's
  // own connection-IP header, which the caller can't forge.
  if (!(await allowRequest('owner', clientIp(req.headers), LIMIT, WINDOW_MS))) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' })
  }

  // Read secret from POST body — never from query string (avoids URL logging).
  // Constant-time comparison so response timing doesn't reveal the secret.
  const { secret } = (req.body ?? {}) as { secret?: unknown }
  if (!secretMatches(secret, OWNER_SECRET)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const token = issueToken('owner', 'owner_access', 365)

  res.setHeader(
    'Set-Cookie',
    `gss_pro=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 365}`
  )
  res.redirect(302, '/')
}
