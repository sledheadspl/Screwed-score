import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(): Promise<NextResponse> {
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

  const allOk = Object.values(checks).every(v => v === 'ok')

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', checks },
    { status: allOk ? 200 : 503 }
  )
}
