import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { PRODUCT_CATALOG } from '@/lib/email/product-delivery'
import { downloadFileName } from '@/lib/paid-downloads'

// Serves a paid file from private/downloads/ only to someone holding the
// Stripe Checkout Session id of a paid purchase that includes that file.
// The session id is in the success-page URL and in the delivery email, so the
// buyer's link keeps working; guessing one is not practical.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRIVATE_DIR = path.join(process.cwd(), 'private', 'downloads')
const FILE_RE = /^[a-z0-9-]+\.html$/
const SESSION_RE = /^cs_(live|test)_[A-Za-z0-9]+$/

function deny(status: number, message: string) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Download unavailable</title>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:15vh auto;padding:0 20px;line-height:1.6;color:#222">
<h1 style="font-size:22px">Download unavailable</h1><p>${message}</p>
<p>If you bought this, open the link in your purchase email, or reply to that email and we'll sort it out.</p>
<p><a href="/academy">Back to the Academy</a></p></body>`
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })
}

/** Files a product delivers: several for a bundle, otherwise its one file. */
function filesFor(productId: string): string[] {
  const product = PRODUCT_CATALOG[productId]
  if (!product) return []
  return product.files?.length
    ? product.files.map(f => downloadFileName(f.path))
    : [downloadFileName(product.defaultPath)]
}

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file') ?? ''
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? ''
  if (!FILE_RE.test(file) || !SESSION_RE.test(sessionId)) {
    return deny(400, 'This download link is incomplete.')
  }

  let productId: string | undefined
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') {
      return deny(402, "We can't see a completed payment for this purchase yet. If you just paid, wait a minute and try again.")
    }
    productId = session.metadata?.product_id
  } catch {
    return deny(404, "We couldn't find this purchase.")
  }

  if (!productId || !filesFor(productId).includes(file)) {
    return deny(403, "This file isn't part of that purchase.")
  }

  let body: Buffer
  try {
    body = await readFile(path.join(PRIVATE_DIR, file))
  } catch {
    console.error('[download] missing file', file)
    return deny(500, 'This file is temporarily unavailable.')
  }

  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
