import { NextResponse } from 'next/server'
import { ADSENSE_PUBLISHER_ID } from '@/lib/adsense'

// Google crawls /ads.txt to verify we authorized AdSense to sell our inventory.
// Served from a route (not public/) so the publisher ID stays a single env var.
export function GET() {
  if (!ADSENSE_PUBLISHER_ID) {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new NextResponse(
    `google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`,
    {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}
