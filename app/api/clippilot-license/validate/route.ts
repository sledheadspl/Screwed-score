import { NextRequest, NextResponse } from 'next/server'
import { validateLicenseKey } from '@/lib/clippilot/license'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const key = body?.key
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ valid: false, tier: null }, { status: 400 })
    }
    const result = await validateLicenseKey(key)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[clippilot-license/validate]', err)
    return NextResponse.json({ valid: false, tier: null }, { status: 500 })
  }
}
