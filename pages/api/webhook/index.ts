import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'
import { issueToken } from '@/lib/auth'

// Stripe requires the raw request body to verify the webhook signature.
// Disable Next.js body parser so we can read the raw stream.
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

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.status !== 'active') break

      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      const token      = issueToken(customerId, sub.id, 7)

      await supabase
        .from('stripe_subscriptions')
        .upsert(
          {
            stripe_customer_id:      customerId,
            stripe_subscription_id:  sub.id,
            token,
            status:     sub.status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_customer_id' }
        )
        .then(({ error }) => {
          if (error) console.error('[webhook] upsert error:', error)
        })
      break
    }

    case 'customer.subscription.deleted': {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

      await supabase
        .from('stripe_subscriptions')
        .update({ status: 'canceled', token: null, updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', customerId)
        .then(({ error }) => {
          if (error) console.error('[webhook] update error:', error)
        })
      break
    }
  }

  return res.status(200).json({ received: true })
}
