import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'
import { sendProductDeliveryEmail, sendClipPilotLicenseEmail, PRODUCT_CATALOG } from '@/lib/email/product-delivery'
import { getClipPilotTier, createLicense } from '@/lib/clippilot/license'

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
  })

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // Must read raw body for signature verification — do NOT use req.json()
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const productId = session.metadata?.product_id

        const customerEmail =
          session.customer_details?.email ??
          (typeof session.customer_email === 'string' ? session.customer_email : null)

        // ClipPilot subscription purchase — generate and email license key
        const clipPilotTier = productId ? getClipPilotTier(productId) : null
        if (clipPilotTier && customerEmail) {
          try {
            const licenseKey = await createLicense({
              stripeSessionId: session.id,
              customerEmail,
              productId: productId!,
              tier: clipPilotTier,
            })
            const result = await sendClipPilotLicenseEmail({
              toEmail: customerEmail,
              licenseKey,
              tier: clipPilotTier,
            })
            if (!result.ok) {
              console.error('[stripe-webhook] ClipPilot license email failed:', result.error)
            }
          } catch (err) {
            console.error('[stripe-webhook] ClipPilot license creation failed:', err)
          }
        }

        // Digital product purchase — email download link
        if (productId && productId in PRODUCT_CATALOG) {
          if (customerEmail) {
            const result = await sendProductDeliveryEmail({
              toEmail: customerEmail,
              productId,
              stripeSessionId: session.id,
            })
            if (!result.ok) {
              console.error('[stripe-webhook] Product delivery failed:', result.error)
            }
          } else {
            console.warn('[stripe-webhook] No customer email for session:', session.id)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase.from('revoked_subscriptions').upsert(
          { subscription_id: sub.id, reason: 'cancelled', revoked_at: new Date().toISOString() },
          { onConflict: 'subscription_id' }
        )
        await supabase
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('stripe_subscription_id', sub.id)
        // Deactivate any ClipPilot license tied to this subscription's customer
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        if (customerId) {
          const stripeCustomer = await stripe.customers.retrieve(customerId) as Stripe.Customer
          const email = stripeCustomer.email
          if (email) {
            await supabase
              .from('clippilot_licenses')
              .update({ is_active: false })
              .eq('customer_email', email)
            console.log('[stripe-webhook] ClipPilot license deactivated for:', email)
          }
        }
        console.log('[stripe-webhook] Subscription cancelled:', sub.id)
        break
      }

      case 'invoice.payment_failed': {
        // In Stripe SDK v21 the Invoice type uses `parent` for subscription linkage;
        // cast to access the subscription field safely regardless of SDK version.
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null }
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null
        if (subscriptionId) {
          await supabase.from('revoked_subscriptions').upsert(
            { subscription_id: subscriptionId, reason: 'payment_failed', revoked_at: new Date().toISOString() },
            { onConflict: 'subscription_id' }
          )
          await supabase
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId)
          console.log('[stripe-webhook] Payment failed for subscription:', subscriptionId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        if (sub.status === 'active') {
          // Re-activate if previously revoked (e.g. payment recovered)
          await supabase
            .from('revoked_subscriptions')
            .delete()
            .eq('subscription_id', sub.id)
          await supabase
            .from('profiles')
            .update({ subscription_status: 'active' })
            .eq('stripe_subscription_id', sub.id)
          console.log('[stripe-webhook] Subscription re-activated:', sub.id)
        }
        break
      }

      default:
        // Acknowledge unhandled event types without error
        break
    }
  } catch (err) {
    console.error('[stripe-webhook] Handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
