import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

// Stripe requires the raw request body to verify the webhook signature.
export const config = { api: { bodyParser: false } }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end',  () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = await getRawBody(req)
  const sig  = req.headers['stripe-signature'] as string | undefined

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Missing signature' })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook] Invalid signature:', err)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  const supabase = createServiceClient()

  // ── Payment completed — log for reconciliation ──────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    console.log('[webhook] Payment completed:', {
      customer:       session.customer,
      payment_intent: session.payment_intent,
      amount:         session.amount_total,
    })
  }

  // ── Subscription cancelled — revoke Pro access immediately ──────────────
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const { error } = await supabase
      .from('revoked_subscriptions')
      .upsert({ subscription_id: sub.id, revoked_at: new Date().toISOString() }, { onConflict: 'subscription_id' })
    if (error) console.error('[webhook] Failed to revoke subscription:', error.message)
    else console.log('[webhook] Subscription revoked:', sub.id)
  }

  // ── Payment failed — revoke Pro access ──────────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null }
    if (invoice.subscription) {
      const { error } = await supabase
        .from('revoked_subscriptions')
        .upsert({ subscription_id: invoice.subscription, revoked_at: new Date().toISOString() }, { onConflict: 'subscription_id' })
      if (error) console.error('[webhook] Failed to revoke on payment failure:', error.message)
    }
  }

  // ── Subscription updated (e.g. downgrade) — revoke if no longer active ──
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    if (sub.status !== 'active' && sub.status !== 'trialing') {
      const { error } = await supabase
        .from('revoked_subscriptions')
        .upsert({ subscription_id: sub.id, revoked_at: new Date().toISOString() }, { onConflict: 'subscription_id' })
      if (error) console.error('[webhook] Failed to revoke on status change:', error.message)
    }
  }

  return res.status(200).json({ received: true })
}
