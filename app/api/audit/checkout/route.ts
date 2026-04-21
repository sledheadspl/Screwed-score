import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { analysis_id, document_type, score_percent, email } = body as Record<string, string>
    if (!analysis_id) return NextResponse.json({ error: 'analysis_id required' }, { status: 400 })

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://screwedscore.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email || undefined,
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
        document_type: document_type ?? 'unknown',
        score_percent: score_percent ?? '0',
      },
      success_url: `${origin}/audit/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[audit/checkout]', err)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}
