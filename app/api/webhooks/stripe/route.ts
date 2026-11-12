import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'
import { sendProductDeliveryEmail, sendClipPilotLicenseEmail, PRODUCT_CATALOG } from '@/lib/email/product-delivery'
import { getClipPilotTier, createLicense } from '@/lib/clippilot/license'
import { sendGAEvent } from '@/lib/ga'
import { logError } from '@/lib/log'

/** Escapes text placed into an HTML email. */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Marks a one-time payment as revoked (refund or dispute) so the Pro pass,
 * Fight Back Kit and ClipPilot license bought with it stop working, and
 * deactivates any ClipPilot license from that checkout.
 */
async function revokePayment(
  stripe: Stripe,
  supabase: ReturnType<typeof createServiceClient>,
  paymentIntentId: string,
  reason: 'refunded' | 'disputed',
): Promise<void> {
  await supabase.from('revoked_subscriptions').upsert(
    { subscription_id: paymentIntentId, reason, revoked_at: new Date().toISOString() },
    { onConflict: 'subscription_id' }
  )
  const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 10 })
  const sessionIds = sessions.data.map(s => s.id)
  if (sessionIds.length > 0) {
    await supabase.from('clippilot_licenses').update({ is_active: false }).in('stripe_session_id', sessionIds)
  }
  console.log(`[stripe-webhook] payment ${paymentIntentId} revoked (${reason})`)
}

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

  // Idempotency guard. Insert event.id; PK conflict means we've already
  // processed this event (Stripe is retrying). Bail with 200 so Stripe stops.
  const { error: dedupErr } = await supabase
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, type: event.type })
  if (dedupErr) {
    if (dedupErr.code === '23505') {
      // Duplicate — already processed. Acknowledge so Stripe stops retrying.
      console.log(`[stripe-webhook] duplicate event ${event.id}, skipping`)
      return NextResponse.json({ received: true, deduped: true })
    }
    // If the dedup table is missing (PGRST205) just proceed — better to
    // process the event than to 500. Migration 011 fixes this.
    if (dedupErr.code !== 'PGRST205') {
      console.error('[stripe-webhook] dedup insert failed:', dedupErr)
    }
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session

        // Delayed payment methods (bank debits and the like) complete checkout
        // before the money arrives. Deliver only once it's paid; Stripe sends
        // checkout.session.async_payment_succeeded when it does.
        if (session.payment_status === 'unpaid') {
          console.log(`[stripe-webhook] session ${session.id} not paid yet, waiting`)
          break
        }
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

        // GA4 purchase event
        const itemName = clipPilotTier
          ? `ClipPilot ${clipPilotTier}`
          : productId && productId in PRODUCT_CATALOG
            ? PRODUCT_CATALOG[productId].name
            : session.metadata?.plan
              ? `Pro Membership (${session.metadata.plan})`
              : session.metadata?.analysis_id
                ? 'Fight Back Kit'
                : 'Scan Token Pack'
        await sendGAEvent('purchase', {
          transaction_id: session.id,
          value:          (session.amount_total ?? 0) / 100,
          currency:       (session.currency ?? 'usd').toUpperCase(),
          item_name:      itemName,
        })

        // Human audit purchase — create job + send confirmation
        if (session.metadata?.type === 'human_audit') {
          const analysisId   = session.metadata.analysis_id
          const documentType = session.metadata.document_type ?? 'bill'
          const scorePercent = session.metadata.score_percent ?? '?'

          // Create a job in the marketplace for this audit. Job listings are
          // public, so the customer's email stays out of it; the operator gets
          // it in the notification email below.
          await supabase.from('jobs').insert({
            title:           `Human Audit — ${documentType.replace(/_/g, ' ')} (Score: ${scorePercent}%)`,
            description:     `Customer paid $9.99 for a human bill audit.\n\nAnalysis ID: ${analysisId}\nDocument type: ${documentType}\nAI score: ${scorePercent}%\n\nReview the analysis at the admin panel, flag all overcharges and errors in plain English, and send your findings to the operator within 48 hours.`,
            category:        'research',
            skills_required: ['research', 'medical billing'],
            pay_description: '$7',
            location_type:   'remote',
            status:          'open',
            min_reputation:  40,
            max_applicants:  1,
          })

          // Confirmation email to customer
          if (customerEmail) {
            const { Resend } = await import('resend')
            const resend = new Resend(process.env.RESEND_API_KEY)
            await resend.emails.send({
              from:    process.env.RESEND_FROM_EMAIL ?? 'hello@screwedscore.com',
              to:      customerEmail,
              subject: 'Your Human Bill Audit is confirmed — 48hr turnaround',
              html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
                  <h2 style="color:#ff3b30">Your audit is in the queue.</h2>
                  <p>A real person is now reviewing your ${esc(documentType.replace(/_/g, ' '))} and will send you a plain-English breakdown of what we found — overcharges, errors, and your action plan.</p>
                  <p><strong>Delivery:</strong> Within 48 hours to this email address.</p>
                  <p><strong>What we're looking at:</strong> Your AI scan scored this bill at ${esc(scorePercent)}% screwed. Our auditor will verify those findings and dig deeper.</p>
                  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
                  <p style="color:#888;font-size:13px">Questions? Reply to this email. — ScrewedScore Team</p>
                </div>
              `,
            }).catch(e => console.error('[audit email]', e))

            // Notify Ryan
            await resend.emails.send({
              from:    process.env.RESEND_FROM_EMAIL ?? 'hello@screwedscore.com',
              to:      'sledheadspl@gmail.com',
              subject: `New Human Audit — ${documentType.replace(/[\r\n]/g, ' ')} — ${String(scorePercent).replace(/[\r\n]/g, ' ')}% — $9.99`,
              html: `<p>New paid audit request.</p><p><b>Customer:</b> ${esc(customerEmail)}<br/><b>Document:</b> ${esc(documentType)}<br/><b>AI Score:</b> ${esc(scorePercent)}%<br/><b>Analysis ID:</b> ${esc(analysisId)}</p><p>Job has been added to the marketplace queue.</p>`,
            }).catch(e => console.error('[audit notify]', e))
          }
          break
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
              await logError('stripe-webhook/product-delivery', new Error(result.error ?? 'unknown'), {
                product_id: productId,
                customer_email: customerEmail,
                session_id: session.id,
              })
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
        // Deactivate the ClipPilot license bought with this subscription. Only
        // fall back to every license on the customer's email when the checkout
        // can't be found, so cancelling one plan doesn't kill another.
        const subSessions = await stripe.checkout.sessions.list({ subscription: sub.id, limit: 10 })
        const subSessionIds = subSessions.data.map(s => s.id)
        if (subSessionIds.length > 0) {
          await supabase
            .from('clippilot_licenses')
            .update({ is_active: false })
            .in('stripe_session_id', subSessionIds)
        } else {
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
          if (customerId) {
            const stripeCustomer = await stripe.customers.retrieve(customerId)
            const email = !stripeCustomer.deleted ? stripeCustomer.email : null
            if (email) {
              await supabase
                .from('clippilot_licenses')
                .update({ is_active: false })
                .eq('customer_email', email)
                .like('product_id', 'clippilot%')
            }
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

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        // Only a full refund takes access away; partial refunds are goodwill.
        if (pi && charge.refunded) await revokePayment(stripe, supabase, pi, 'refunded')
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const pi = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id
        if (pi) await revokePayment(stripe, supabase, pi, 'disputed')
        break
      }

      default:
        // Acknowledge unhandled event types without error
        break
    }
  } catch (err) {
    await logError('stripe-webhook', err, { event_type: event.type, event_id: event.id })
    // Drop the dedup row so Stripe's retry of this event is processed instead
    // of being skipped as a duplicate.
    await supabase.from('stripe_webhook_events').delete().eq('event_id', event.id)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
