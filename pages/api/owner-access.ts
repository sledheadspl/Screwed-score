import type { NextApiRequest, NextApiResponse } from 'next'
import { issueToken } from '@/lib/auth'

const OWNER_SECRET = process.env.OWNER_ACCESS_SECRET

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { secret } = req.query
  if (!OWNER_SECRET || secret !== OWNER_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Generate token dynamically — never store a static token in source code
  const token = issueToken('owner', 'owner_access', 365)

  res.setHeader(
    'Set-Cookie',
    `gss_pro=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 365}`
  )
  res.redirect(302, '/')
}
