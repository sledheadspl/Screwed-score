import { NextRequest, NextResponse } from 'next/server'
import { resolveDispute } from '@/lib/disputes/service'
import { getSessionUserId } from '@/lib/session-user'
import { isOperatorRequest } from '@/lib/secure-compare'

export const runtime = 'nodejs'

interface Params {
  params: Promise<{ id: string }>
}

const KNOWN_ERRORS = new Map<string, number>([
  ['Dispute not found', 404],
  ['Not authorized to resolve this dispute', 403],
  ['Dispute is already resolved', 409],
])

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Who is asking: the operator (X-Operator-Secret) or a signed-in user.
    const isOperator = isOperatorRequest(req.headers)
    const userId = await getSessionUserId(req.headers.get('cookie'))
    if (!isOperator && !userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { resolution_notes } = body as Record<string, unknown>
    if (typeof resolution_notes !== 'string' || !resolution_notes.trim()) {
      return NextResponse.json({ error: 'resolution_notes is required' }, { status: 400 })
    }
    if (resolution_notes.length > 2000) {
      return NextResponse.json({ error: 'resolution_notes too long (max 2000 characters)' }, { status: 400 })
    }

    // Ownership is enforced in resolveDispute: only the dispute's owner or
    // the operator can resolve; ownerless disputes are operator-only.
    const dispute = await resolveDispute(id, { resolution_notes }, { userId, isOperator })
    return NextResponse.json({ dispute })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    const status = KNOWN_ERRORS.get(msg)
    if (status) return NextResponse.json({ error: msg }, { status })
    console.error('[disputes/resolve] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
