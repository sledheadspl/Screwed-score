import { NextRequest, NextResponse } from 'next/server'
import { replyToDispute } from '@/lib/disputes/service'
import { getSessionUserId } from '@/lib/session-user'
import { allowRequest, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

interface Params {
  params: Promise<{ id: string }>
}

const HOUR_MS = 60 * 60 * 1000
const MAX_BODY = 2000

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Replies need a signed-in account.
    const userId = await getSessionUserId(req.headers.get('cookie'))
    if (!userId) {
      return NextResponse.json({ error: 'Sign in to reply to a dispute' }, { status: 401 })
    }

    // 20 replies per account and 30 per IP per hour.
    if (
      !(await allowRequest('dispute-reply-user', userId, 20, HOUR_MS)) ||
      !(await allowRequest('dispute-reply-ip', clientIp(req.headers), 30, HOUR_MS))
    ) {
      return NextResponse.json({ error: 'Too many replies. Try again later.' }, { status: 429 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { body: msgBody } = body as Record<string, unknown>
    if (typeof msgBody !== 'string' || !msgBody.trim()) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 })
    }
    if (msgBody.length > MAX_BODY) {
      return NextResponse.json({ error: `body too long (max ${MAX_BODY} characters)` }, { status: 400 })
    }

    const message = await replyToDispute(
      id,
      { body: msgBody, is_vendor_rep: false },
      userId
    )

    return NextResponse.json({ message }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'Dispute not found') {
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    if (msg === 'Cannot reply to a resolved or closed dispute') {
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    console.error('[disputes/reply] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
