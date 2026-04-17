import { NextRequest, NextResponse } from 'next/server'
import { lookupLicenseByEmail } from '@/lib/clippilot/license'

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
    const email = body?.email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ found: false, tier: null, license_key: null }, { status: 400, headers: CORS })
    }
    const result = await lookupLicenseByEmail(email)
    return NextResponse.json(result, { headers: CORS })
  } catch (err) {
    console.error('[clippilot-license/lookup-by-email]', err)
    return NextResponse.json({ found: false, tier: null, license_key: null }, { status: 500, headers: CORS })
  }
}
