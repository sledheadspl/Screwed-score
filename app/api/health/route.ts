import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Require X-Health-Token header if HEALTH_SECRET is configured
  const healthSecret = process.env.HEALTH_SECRET
  if (healthSecret) {
    const provided = req.headers.get('x-health-token')
    if (provided !== healthSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const checks: Record<string, 'ok' | 'error'> = {}

  // Check Supabase connectivity
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('rate_limits').select('ip_hash').limit(1)
    checks.supabase = error ? 'error' : 'ok'
  } catch {
    checks.supabase = 'error'
  }

  // Check required env vars are present (values not exposed)
  checks.anthropic_key  = process.env.ANTHROPIC_API_KEY   ? 'ok' : 'error'
  checks.stripe_key     = process.env.STRIPE_SECRET_KEY    ? 'ok' : 'error'
  checks.token_secret   = process.env.GSS_TOKEN_SECRET     ? 'ok' : 'error'
  checks.owner_secret   = process.env.OWNER_ACCESS_SECRET  ? 'ok' : 'error'

  const allOk = Object.values(checks).every(v => v === 'ok')

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks },
    { status: allOk ? 200 : 503 }
  )
}
