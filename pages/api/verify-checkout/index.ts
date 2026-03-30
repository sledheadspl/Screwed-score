import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { issueToken } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : null
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id' })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(402).json({ error: 'Payment not completed' })
    }

    const customerId     = typeof session.customer     === 'string' ? session.customer     : null
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null

    if (!customerId || !subscriptionId) {
      return res.status(400).json({ error: 'Invalid session data' })
    }

    const token = issueToken(customerId, subscriptionId, 32)

    // Short cookie TTL — renewal handled by Stripe webhook
    res.setHeader(
      'Set-Cookie',
      `gss_pro=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`
    )

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[verify-checkout]', err)
    return res.status(500).json({ error: 'Verification failed' })
  }
}
