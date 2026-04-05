import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const checks: Record<string, string> = {}

  // Check env vars are present
  checks.supabase_url     = process.env.NEXT_PUBLIC_SUPABASE_URL     ? 'set' : 'MISSING'
  checks.supabase_anon    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'MISSING'
  checks.supabase_service = process.env.SUPABASE_SERVICE_ROLE_KEY     ? 'set' : 'MISSING'
  checks.anthropic_key    = process.env.ANTHROPIC_API_KEY             ? 'set' : 'MISSING'
  checks.stripe_key       = process.env.STRIPE_SECRET_KEY             ? 'set' : 'MISSING'
  checks.gss_token_secret = process.env.GSS_TOKEN_SECRET              ? 'set' : 'MISSING'

  // Test Supabase connection
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('documents').select('id').limit(1)
    checks.supabase_db = error ? `ERROR: ${error.message}` : 'ok'
  } catch (err) {
    checks.supabase_db = `THROW: ${err instanceof Error ? err.message : String(err)}`
  }

  const allOk = Object.values(checks).every(v => v === 'ok')
  return res.status(allOk ? 200 : 503).json({ status: allOk ? 'ok' : 'degraded', checks })
}
