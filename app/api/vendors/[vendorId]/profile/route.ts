import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getVendorById } from '@/lib/vendors/service'
import { computeVendorReputation } from '@/lib/vendors/reputation'
import { getSessionUserId } from '@/lib/session-user'
import { toHttpUrl } from '@/lib/safe-url'

export const runtime = 'nodejs'
export const maxDuration = 30

interface Params {
  params: Promise<{ vendorId: string }>
}

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { vendorId } = await params
    if (!vendorId) return NextResponse.json({ error: 'vendorId is required' }, { status: 400 })

    const vendor = await getVendorById(vendorId)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })

    const reputation = await computeVendorReputation(vendorId)
    return NextResponse.json({ vendor, reputation })
  } catch (err: unknown) {
    console.error('[vendors/profile GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { vendorId } = await params

    const userId = await getSessionUserId(req.headers.get('cookie'))
    if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const supabase = createServiceClient()

    // Verify ownership
    const { data: vendor } = await supabase
      .from('vendors')
      .select('claimed_by, verified')
      .eq('id', vendorId)
      .maybeSingle()

    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    if (vendor.claimed_by !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // A pending claim can't change the public listing until an operator approves it.
    if (!vendor.verified) {
      return NextResponse.json(
        { error: 'Your claim is pending review. You can edit your profile once it is approved.' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    // Allowlist of editable fields
    const allowed = ['bio', 'tagline', 'logo_url', 'response_statement', 'website', 'phone', 'city', 'state', 'zip']
    const updates: Record<string, string | null> = {}
    for (const key of allowed) {
      if (key in body && (typeof body[key] === 'string' || body[key] === null)) {
        updates[key] = typeof body[key] === 'string' ? (body[key] as string).slice(0, 2000) : body[key]
      }
    }

    // Links must be plain http(s): no javascript:, data: or other schemes.
    for (const key of ['website', 'logo_url'] as const) {
      if (!(key in updates)) continue
      const raw = updates[key]
      if (raw === null || raw.trim() === '') { updates[key] = null; continue }
      const url = toHttpUrl(raw)
      if (!url || url.length > 500) {
        return NextResponse.json({ error: `${key} must be an http or https URL` }, { status: 400 })
      }
      updates[key] = url
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('vendors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', vendorId)
      .select()
      .single()

    if (updateErr) throw new Error(updateErr.message)
    return NextResponse.json({ vendor: updated })
  } catch (err) {
    console.error('[vendors/profile PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
