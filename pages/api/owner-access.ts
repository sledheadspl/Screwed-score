import type { NextApiRequest, NextApiResponse } from 'next'

const OWNER_SECRET = process.env.OWNER_ACCESS_SECRET || 'sledheads'
const PRO_TOKEN = 'b3duZXJfc2xlZGhlYWRzc3BsOm93bmVyX3N1YjoyMDkwMjUzMTYw.b862f7f2f94359e9b089264fbefd30a51da91c557b2917dc1152e83aa4d15f50'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { secret } = req.query
  if (secret !== OWNER_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.setHeader(
    'Set-Cookie',
    `gss_pro=${PRO_TOKEN}; Path=/; Max-Age=315360000; SameSite=Strict; Secure`
  )
  res.redirect(302, '/')
}
