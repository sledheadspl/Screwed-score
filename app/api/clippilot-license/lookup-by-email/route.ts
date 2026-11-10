import { NextRequest, NextResponse } from 'next/server'
import { lookupLicenseByEmail } from '@/lib/clippilot/license'
import { allowRequest, clientIp } from '@/lib/rate-limit'

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
    if (!(await allowRequest('license-lookup', clientIp(req.headers), 10, 60 * 60 * 1000))) {
      return NextResponse.json({ found: false, tier: null, license_key: null }, { status: 429, headers: CORS })
    }
    // Never hand out a license key to whoever types an email address. The key
    // goes to the buyer in the purchase email; this only says whether one exists.
    const result = await lookupLicenseByEmail(email.trim())
    return NextResponse.json({ found: result.found, tier: result.tier, license_key: null }, { headers: CORS })
  } catch (err) {
    console.error('[clippilot-license/lookup-by-email]', err)
    return NextResponse.json({ found: false, tier: null, license_key: null }, { status: 500, headers: CORS })
  }
}
