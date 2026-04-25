import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendNurtureStep, NURTURE_DELAYS_HOURS } from '@/lib/email/nurture'
import { logError } from '@/lib/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Process up to this many subscribers per cron tick. Keep small to stay
// well under the 60s function timeout and Resend's rate limits.
const BATCH_LIMIT = 25

interface WaitlistRow {
  email: string
  nurture_step: number
  nurture_next_at: string | null
}

export async function GET(req: NextRequest) {
  return handle(req)
}
export async function POST(req: NextRequest) {
  return handle(req)
}

async function handle(req: NextRequest): Promise<NextResponse> {
  // Auth: header X-Cron-Secret must match env. Reject anything else.
  const secret = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const nowIso = new Date().toISOString()

  const { data: due, error: queryErr } = await supabase
    .from('waitlist')
    .select('email, nurture_step, nurture_next_at')
    .lt('nurture_step', 3)
    .not('nurture_next_at', 'is', null)
    .lte('nurture_next_at', nowIso)
    .order('nurture_next_at', { ascending: true })
    .limit(BATCH_LIMIT)

  if (queryErr) {
    await logError('cron/nurture', queryErr, { stage: 'query' })
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const rows = (due ?? []) as WaitlistRow[]
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const row of rows) {
    const step = row.nurture_step as 0 | 1 | 2
    const result = await sendNurtureStep(row.email, step)

    if (!result.ok) {
      failed++
      errors.push(`${row.email}: ${result.error}`)
      // Skip — leave nurture_next_at where it is so it retries next tick.
      // If a row fails repeatedly, advancing it manually is acceptable.
      continue
    }

    const nextStep = step + 1
    const nextDelayHours = NURTURE_DELAYS_HOURS[nextStep] ?? null
    const nextAt = nextDelayHours
      ? new Date(Date.now() + nextDelayHours * 60 * 60 * 1000).toISOString()
      : null

    const { error: updateErr } = await supabase
      .from('waitlist')
      .update({
        nurture_step: nextStep,
        nurture_last_sent: nowIso,
        nurture_next_at: nextAt,
      })
      .eq('email', row.email)

    if (updateErr) {
      failed++
      errors.push(`${row.email} update: ${updateErr.message}`)
    } else {
      sent++
    }
  }

  return NextResponse.json({
    ok: true,
    processed: rows.length,
    sent,
    failed,
    ...(errors.length ? { errors: errors.slice(0, 10) } : {}),
  })
}
