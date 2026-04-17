import { NextRequest, NextResponse } from 'next/server'
import { validateLicenseKey } from '@/lib/clippilot/license'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const key = body?.key
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ valid: false, tier: null }, { status: 400, headers: CORS })
    }
    const result = await validateLicenseKey(key.trim())
    return NextResponse.json(result, { headers: CORS })
  } catch (err) {
    console.error('[clippilot-license/validate]', err)
    return NextResponse.json({ valid: false, tier: null }, { status: 500, headers: CORS })
  }
}
