import { NextRequest, NextResponse } from 'next/server'
import { lookupLicenseByEmail } from '@/lib/clippilot/license'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = body?.email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ found: false, tier: null, license_key: null }, { status: 400 })
    }
    const result = await lookupLicenseByEmail(email)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[clippilot-license/lookup-by-email]', err)
    return NextResponse.json({ found: false, tier: null, license_key: null }, { status: 500 })
  }
}
