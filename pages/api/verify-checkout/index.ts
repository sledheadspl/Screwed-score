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

    const customerId = typeof session.customer === 'string' ? session.customer : null
    // One-time passes carry a payment_intent; Pro subscriptions carry a
    // subscription id instead (used to check revoked_subscriptions on scan).
    const refId =
      (typeof session.payment_intent === 'string' ? session.payment_intent : null) ??
      (typeof session.subscription   === 'string' ? session.subscription   : null)

    if (!customerId || !refId) {
      return res.status(400).json({ error: 'Invalid session data' })
    }

    // One-time pass / monthly: 32 days covers a billing cycle. Yearly: 370 days
    // (cancellations are caught via revoked_subscriptions at scan time).
    const ttlDays = session.metadata?.plan === 'yearly' ? 370 : 32
    const token = issueToken(customerId, refId, ttlDays)

    res.setHeader(
      'Set-Cookie',
      `gss_pro=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * ttlDays}`
    )

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[verify-checkout]', err)
    return res.status(500).json({ error: 'Verification failed' })
  }
}
