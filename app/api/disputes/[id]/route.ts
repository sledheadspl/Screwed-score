import { NextRequest, NextResponse } from 'next/server'
import { getDisputeById } from '@/lib/disputes/service'

export const runtime = 'nodejs'

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const dispute = await getDisputeById(id)
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    return NextResponse.json({ dispute })
  } catch (err: unknown) {
    console.error('[disputes/[id]] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
