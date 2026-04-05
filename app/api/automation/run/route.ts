import { NextRequest, NextResponse } from 'next/server'
import { runAutomationJob } from '@/lib/automation/engine'
import { isAutomationJobType } from '@/lib/types/automation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { type, input } = body as { type: unknown; input: unknown }

    if (!isAutomationJobType(type)) {
      return NextResponse.json(
        { error: 'Invalid job type. Must be: text_generation, invoice_analysis, summary, or generic' },
        { status: 400 }
      )
    }

    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return NextResponse.json({ error: 'input must be an object' }, { status: 400 })
    }

    const result = await runAutomationJob(type, input as Record<string, unknown>)

    const statusCode = result.status === 'completed' ? 200 : 500
    return NextResponse.json(result, { status: statusCode })
  } catch (err: unknown) {
    console.error('[automation/run] error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
