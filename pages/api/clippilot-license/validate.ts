import type { NextApiRequest, NextApiResponse } from 'next'
import { validateLicenseKey } from '@/lib/clippilot/license'

// Allow calls from the ClipPilot desktop app (any origin)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS).end()
    return
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { key } = req.body ?? {}
  if (!key || typeof key !== 'string' || !key.trim()) {
    return res.status(400).json({ error: 'key is required' })
  }

  const result = await validateLicenseKey(key.trim())

  if (!result.valid) {
    return res.status(200).json({ valid: false, tier: null })
  }

  return res.status(200).json({ valid: true, tier: result.tier, expires_at: null })
}
