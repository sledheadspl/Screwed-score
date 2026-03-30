import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (req.headers.origin as string | undefined) ??
      'https://getscrewedscore.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.GSS_STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${origin}/paid?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/`,
      allow_promotion_codes:      true,
      billing_address_collection: 'auto',
      customer_creation:          'always',
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[checkout]', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
