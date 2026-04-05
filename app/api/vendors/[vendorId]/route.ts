import { NextRequest, NextResponse } from 'next/server'
import { getVendorById } from '@/lib/vendors/service'
import { getVendorReputation } from '@/lib/vendors/reputation'

export const runtime = 'nodejs'

interface Params {
  params: Promise<{ vendorId: string }>
}

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { vendorId } = await params
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 })
    }

    const vendor = await getVendorById(vendorId)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const reputation = await getVendorReputation(vendorId)
    return NextResponse.json({ vendor, reputation })
  } catch (err: unknown) {
    console.error('[vendors/[vendorId]] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
