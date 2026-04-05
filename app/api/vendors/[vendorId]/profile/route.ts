import { NextRequest, NextResponse } from 'next/server'
import { getVendorById } from '@/lib/vendors/service'
import { computeVendorReputation } from '@/lib/vendors/reputation'

export const runtime = 'nodejs'
export const maxDuration = 30

interface Params {
  params: { vendorId: string }
}

/**
 * GET /api/vendors/[vendorId]/profile
 * Returns vendor details with a freshly computed reputation score + AI summary.
 */
export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { vendorId } = params
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 })
    }

    const vendor = await getVendorById(vendorId)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const reputation = await computeVendorReputation(vendorId)
    return NextResponse.json({ vendor, reputation })
  } catch (err: unknown) {
    console.error('[vendors/[vendorId]/profile] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
