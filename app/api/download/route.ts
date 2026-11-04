import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { PRODUCT_CATALOG } from '@/lib/email/product-delivery'
import { getStripe, isPaidSession } from '@/lib/stripe'

export const runtime = 'nodejs'

// Paid digital products live in private/products/ (bundled into this function
// via outputFileTracingIncludes in next.config.ts) and are only served to a
// buyer whose Stripe checkout session paid for that exact product.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const productId = req.nextUrl.searchParams.get('product') ?? ''
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? ''

  const product = Object.prototype.hasOwnProperty.call(PRODUCT_CATALOG, productId) ? PRODUCT_CATALOG[productId] : null
  if (!product || !sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Invalid download link' }, { status: 400 })
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    if (!isPaidSession(session) || session.metadata?.product_id !== productId) {
      return NextResponse.json({ error: 'This link is not valid for this product' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid download link' }, { status: 403 })
  }

  try {
    // product.file comes from our own catalog, never from the request.
    const html = await readFile(path.join(process.cwd(), 'private', 'products', product.file), 'utf8')
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  } catch (err) {
    console.error('[download] missing product file', product.file, err)
    return NextResponse.json({ error: 'Download unavailable — reply to your receipt email for help' }, { status: 500 })
  }
}
