import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createHmac } from 'crypto'
import { createServiceClient } from '@/lib/supabase'

export const config = { api: { bodyParser: false } }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

function issueToken(customerId: string, subscriptionId: string): string {
  const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
  const payload = `${customerId}:${subscriptionId}:${expiry}`
  const sig = createHmac('sha256', process.env.GSS_TOKEN_SECRET!)
    .update(payload)
    .digest('hex')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.status !== 'active') break

      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      const token = issueToken(customerId, sub.id)

      // Store token mapped to customer so we can reissue on next login
      await supabase.from('stripe_subscriptions').upsert({
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        token,
        status: sub.status,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'stripe_customer_id' }).then(({ error }) => { if (error) console.error('[webhook] upsert error:', error) })

      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

      await supabase.from('stripe_subscriptions').update({
        status: 'canceled',
        token: null,
        updated_at: new Date().toISOString(),
      }).eq('stripe_customer_id', customerId).then(({ error }) => { if (error) console.error('[webhook] update error:', error) })

      break
    }
  }

  return NextResponse.json({ received: true })
}
