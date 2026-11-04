import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'
import { issueToken } from '@/lib/auth'
import { getStripe, isPaidSession, recordUse } from '@/lib/stripe'

const DAY = 60 * 60 * 24
// One-time pass: 30 days of Pro, plus 2 days of slack.
const PASS_TTL_DAYS = 32
// Subscription cookies last until the paid-through date plus this grace period.
const SUB_GRACE_DAYS = 2
// How many times one purchase can mint a cookie (per billing period for
// subscriptions): covers a few devices/browsers without letting a shared
// /paid?session_id=… link hand out Pro to everyone.
const MAX_ACTIVATIONS = 5

type Plan = 'pass' | 'monthly' | 'yearly'

/** Which Pro product a checkout session bought, from its line items (source of truth). */
async function proPlanFor(stripe: Stripe, session: Stripe.Checkout.Session): Promise<Plan | null> {
  const prices: Record<string, Plan> = {}
  if (process.env.GSS_STRIPE_PRICE_ID) prices[process.env.GSS_STRIPE_PRICE_ID] = 'pass'
  if (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY) prices[process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY] = 'monthly'
  if (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY) prices[process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY] = 'yearly'

  const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 })
  for (const item of items.data) {
    const plan = item.price?.id ? prices[item.price.id] : undefined
    if (plan) return plan
  }
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // session_id comes from the POST body (sent by /paid page)
  const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id : null
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'Missing session_id' })
  }

  const stripe = getStripe()

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!isPaidSession(session)) {
      return res.status(402).json({ error: 'Payment not completed' })
    }

    // Only Pro purchases unlock Pro — not kits, audits, digital products or ClipPilot.
    const plan = await proPlanFor(stripe, session)
    if (!plan) {
      return res.status(403).json({ error: 'This purchase does not include Pro access.' })
    }

    const customerId = typeof session.customer === 'string' ? session.customer : null
    if (!customerId) {
      return res.status(400).json({ error: 'Invalid session data' })
    }

    const now = Math.floor(Date.now() / 1000)
    let refId: string
    let expiresAt: number
    let activated: boolean

    if (plan === 'pass') {
      const piId = typeof session.payment_intent === 'string' ? session.payment_intent : null
      if (!piId) return res.status(400).json({ error: 'Invalid session data' })
      refId = piId
      // Anchored to the purchase time, so replaying the link later cannot
      // extend a one-time pass.
      expiresAt = session.created + PASS_TTL_DAYS * DAY
      if (expiresAt <= now) {
        return res.status(410).json({ error: 'This 30-day pass has expired.' })
      }
      activated = await recordUse({
        read: async () => (await stripe.paymentIntents.retrieve(piId)).metadata,
        write: metadata => stripe.paymentIntents.update(piId, { metadata }),
        key: 'gss_activations',
        period: 'pass',
        max: MAX_ACTIVATIONS,
      })
    } else {
      const subId = typeof session.subscription === 'string' ? session.subscription : null
      if (!subId) return res.status(400).json({ error: 'Invalid session data' })
      refId = subId
      const sub = await stripe.subscriptions.retrieve(subId)
      if (sub.status !== 'active' && sub.status !== 'trialing') {
        return res.status(403).json({ error: 'This subscription is no longer active.' })
      }
      const periodEnd = Math.max(0, ...sub.items.data.map(i => i.current_period_end))
      expiresAt = (periodEnd || now + 32 * DAY) + SUB_GRACE_DAYS * DAY
      activated = await recordUse({
        read: async () => sub.metadata,
        write: metadata => stripe.subscriptions.update(subId, { metadata }),
        key: 'gss_activations',
        period: String(periodEnd),
        max: MAX_ACTIVATIONS,
      })
    }

    if (!activated) {
      return res.status(429).json({
        error: 'This purchase has already been activated on the maximum number of devices. Reply to your receipt email if you need help.',
      })
    }

    const ttlSeconds = expiresAt - now
    const token = issueToken(customerId, refId, ttlSeconds / DAY)

    res.setHeader(
      'Set-Cookie',
      `gss_pro=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ttlSeconds}`
    )

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[verify-checkout]', err)
    return res.status(500).json({ error: 'Verification failed' })
  }
}
