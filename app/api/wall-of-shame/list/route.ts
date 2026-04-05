import { NextRequest, NextResponse } from 'next/server'
import { listWallOfShame } from '@/lib/wall-of-shame/service'
import { isVendorCategory } from '@/lib/types/vendors'

export const runtime = 'nodejs'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const categoryRaw = searchParams.get('category')
    const state = searchParams.get('state') ?? undefined
    const limitRaw = searchParams.get('limit')
    const offsetRaw = searchParams.get('offset')

    const category = isVendorCategory(categoryRaw) ? categoryRaw : undefined
    const limit = limitRaw ? Math.min(parseInt(limitRaw, 10) || 20, 50) : 20
    const offset = offsetRaw ? Math.max(parseInt(offsetRaw, 10) || 0, 0) : 0

    const entries = await listWallOfShame({ category, state, limit, offset })
    return NextResponse.json({ entries, limit, offset })
  } catch (err: unknown) {
    console.error('[wall-of-shame/list] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
