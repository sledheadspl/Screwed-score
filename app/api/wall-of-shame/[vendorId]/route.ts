import { NextRequest, NextResponse } from 'next/server'
import { getWallOfShameEntry } from '@/lib/wall-of-shame/service'

export const runtime = 'nodejs'

interface Params {
  params: { vendorId: string }
}

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { vendorId } = params
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 })
    }

    const entry = await getWallOfShameEntry(vendorId)
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json({ entry })
  } catch (err: unknown) {
    console.error('[wall-of-shame/[vendorId]] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
