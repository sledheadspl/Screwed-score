import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { issueToken } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // session_id comes from the POST body (sent by /paid page)
  const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id : null
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id' })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment not completed' })
    }

    const customerId  = typeof session.customer       === 'string' ? session.customer       : null
    const paymentId   = typeof session.payment_intent === 'string' ? session.payment_intent : null

    if (!customerId || !paymentId) {
      return res.status(400).json({ error: 'Invalid session data' })
    }

    // Token valid for 32 days — enough to cover one billing cycle
    const token = issueToken(customerId, paymentId, 32)

    res.setHeader(
      'Set-Cookie',
      `gss_pro=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 32}`
    )

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[verify-checkout]', err)
    return res.status(500).json({ error: 'Verification failed' })
  }
}
