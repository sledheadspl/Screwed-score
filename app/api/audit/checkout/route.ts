import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

import { stripe } from '@/lib/stripe'
import { allowRequest, clientIp } from '@/lib/rate-limit'
import { isDocumentType } from '@/lib/types'
import { isValidUUID } from '@/lib/utils'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.screwedscore.com'
const ALLOWED_ORIGINS = [
  SITE,
  SITE.replace('https://', 'https://www.'),
  SITE.replace('https://www.', 'https://'),
]

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const requestOrigin = req.headers.get('origin')
    if (requestOrigin && !ALLOWED_ORIGINS.includes(requestOrigin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!(await allowRequest('audit-checkout', clientIp(req.headers), 10, 60 * 60 * 1000))) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { analysis_id, document_type, score_percent, email } = body as Record<string, unknown>
    if (typeof analysis_id !== 'string' || !isValidUUID(analysis_id)) {
      return NextResponse.json({ error: 'analysis_id required' }, { status: 400 })
    }

    // These values end up in the public job listing and in emails, so only
    // known document types and a plain 0-100 score get through.
    const docType = isDocumentType(document_type) ? document_type : 'unknown'
    const scoreNum = Number.parseInt(String(score_percent ?? ''), 10)
    const score = Number.isFinite(scoreNum) && scoreNum >= 0 && scoreNum <= 100 ? String(scoreNum) : '0'
    const customerEmail =
      typeof email === 'string' && email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
        ? email
        : undefined

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [{
        quantity: 1,
        price_data: {
          currency:     'usd',
          unit_amount:  999, // $9.99
          product_data: {
            name:        'Human Bill Audit',
            description: 'A real person reviews your bill and delivers a plain-English audit within 48 hours. Flags overcharges, errors, and gives you an action plan.',
            images:      [],
          },
        },
      }],
      metadata: {
        type:          'human_audit',
        analysis_id,
        document_type: docType,
        score_percent: score,
      },
      success_url: `${SITE}/audit/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${SITE}/`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[audit/checkout]', err)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}
