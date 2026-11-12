import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getSessionUserId } from '@/lib/session-user'
import { allowRequest, clientIp } from '@/lib/rate-limit'
import { isOperatorRequest } from '@/lib/secure-compare'

export const runtime = 'nodejs'

interface Params { params: Promise<{ vendorId: string }> }

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * A signed-in user asks to claim a business. The claim is recorded as
 * pending (claimed_by set, verified = false). Nothing the claimant does is
 * shown on the public listing until an operator approves it with PATCH below;
 * the profile route refuses edits while the claim is pending.
 */
export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { vendorId } = await params

    const userId = await getSessionUserId(req.headers.get('cookie'))
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Limit claim attempts so one account can't squat on many listings.
    if (
      !(await allowRequest('vendor-claim-user', userId, 3, DAY_MS)) ||
      !(await allowRequest('vendor-claim-ip', clientIp(req.headers), 5, DAY_MS))
    ) {
      return NextResponse.json({ error: 'Too many claim requests. Try again later.' }, { status: 429 })
    }

    const supabase = createServiceClient()

    const { data: vendor, error: fetchErr } = await supabase
      .from('vendors')
      .select('id, name, claimed_by, verified')
      .eq('id', vendorId)
      .maybeSingle()

    if (fetchErr || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (vendor.claimed_by && vendor.claimed_by !== userId) {
      return NextResponse.json({ error: 'This business has already been claimed' }, { status: 409 })
    }

    // Already claimed by this user — idempotent
    if (vendor.claimed_by === userId) {
      return NextResponse.json({ ok: true, vendorId, status: vendor.verified ? 'approved' : 'pending' })
    }

    // Record a pending claim. The .is() guard stops two people racing for
    // the same unclaimed listing.
    const { data: claimed, error: updateErr } = await supabase
      .from('vendors')
      .update({ claimed_by: userId, claimed_at: new Date().toISOString(), verified: false })
      .eq('id', vendorId)
      .is('claimed_by', null)
      .select('id')

    if (updateErr) throw updateErr
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: 'This business has already been claimed' }, { status: 409 })
    }

    return NextResponse.json({ ok: true, vendorId, status: 'pending' })
  } catch (err) {
    console.error('[vendors/claim]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Operator review of a pending claim. Header X-Operator-Secret must match
 * OWNER_ACCESS_SECRET (same as the other operator routes).
 * Body: { "action": "approve" } marks the claim verified;
 *       { "action": "reject" }  clears the claim so the real owner can claim it.
 */
export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  if (!isOperatorRequest(req.headers)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { vendorId } = await params
    const body = await req.json().catch(() => null) as { action?: unknown } | null
    const action = body?.action
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, claimed_by')
      .eq('id', vendorId)
      .maybeSingle()

    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    if (!vendor.claimed_by) return NextResponse.json({ error: 'No claim to review' }, { status: 409 })

    const updates = action === 'approve'
      ? { verified: true }
      : { claimed_by: null, claimed_at: null, verified: false }

    const { error } = await supabase
      .from('vendors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', vendorId)

    if (error) throw error
    return NextResponse.json({ ok: true, vendorId, status: action === 'approve' ? 'approved' : 'rejected' })
  } catch (err) {
    console.error('[vendors/claim PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
