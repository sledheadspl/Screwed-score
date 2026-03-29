import { NextResponse } from 'next/server'

export function GET() {
  return new NextResponse(
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://getscrewedscore.com/sitemap.xml`,
    { headers: { 'Content-Type': 'text/plain' } }
  )
}
