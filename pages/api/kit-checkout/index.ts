import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://screwedscore.com'

  const requestOrigin = req.headers.origin as string | undefined
  if (requestOrigin && requestOrigin !== origin) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { analysis_id } = req.body as { analysis_id?: string }
  if (!analysis_id || typeof analysis_id !== 'string') {
    return res.status(400).json({ error: 'analysis_id required' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 1499,
          product_data: {
            name: 'Fight Back Kit',
            description: 'Professional demand letter, phone script, chargeback guide, escalation path, and 3-part follow-up email sequence — personalized to your analysis.',
          },
        },
        quantity: 1,
      }],
      metadata: { analysis_id },
      success_url: `${origin}/r/${analysis_id}?kit_session={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/`,
      allow_promotion_codes: true,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[kit-checkout]', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
