import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'
import { sendProductDeliveryEmail, sendClipPilotLicenseEmail, PRODUCT_CATALOG } from '@/lib/email/product-delivery'
import { getClipPilotTier, createLicense } from '@/lib/clippilot/license'
import { sendGAEvent } from '@/lib/ga'
import { logError } from '@/lib/log'

/** Supabase calls resolve with { error } instead of throwing — make failures throw so Stripe retries. */
function must<T extends { error: unknown }>(result: T, what: string): T {
  if (result.error) throw new Error(`${what}: ${JSON.stringify(result.error)}`)
  return result
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

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const productId = session.metadata?.product_id

        const customerEmail =
          session.customer_details?.email ??
          (typeof session.customer_email === 'string' ? session.customer_email : null)

        // ClipPilot subscription purchase — generate and email license key
        const clipPilotTier = productId ? getClipPilotTier(productId) : null
        if (clipPilotTier && customerEmail) {
          // createLicense is idempotent per session, so a Stripe retry after a
          // failure here will not mint a second key.
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
            await logError('stripe-webhook/clippilot-email', new Error(result.error ?? 'unknown'), {
              customer_email: customerEmail,
              session_id: session.id,
            })
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

          // Create a job in the marketplace for this audit. Non-fatal: the
          // owner notification email below still carries everything needed.
          const { error: jobErr } = await supabase.from('jobs').insert({
            title:           `Human Audit — ${documentType.replace(/_/g, ' ')} (Score: ${scorePercent}%)`,
            description:     `Customer paid $9.99 for a human bill audit.\n\nAnalysis ID: ${analysisId}\nDocument type: ${documentType}\nAI score: ${scorePercent}%\nCustomer email: ${customerEmail ?? 'unknown'}\n\nReview the analysis at the admin panel, flag all overcharges and errors in plain English, and email the customer your findings within 48 hours.`,
            category:        'research',
            skills_required: ['research', 'medical billing'],
            pay_description: '$7',
            location_type:   'remote',
            status:          'open',
            min_reputation:  40,
            max_applicants:  1,
          })
          if (jobErr) {
            await logError('stripe-webhook/audit-job', new Error(jobErr.message), { session_id: session.id })
          }

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
                  <p>A real person is now reviewing your ${documentType.replace(/_/g, ' ')} and will send you a plain-English breakdown of what we found — overcharges, errors, and your action plan.</p>
                  <p><strong>Delivery:</strong> Within 48 hours to this email address.</p>
                  <p><strong>What we're looking at:</strong> Your AI scan scored this bill at ${scorePercent}% screwed. Our auditor will verify those findings and dig deeper.</p>
                  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
                  <p style="color:#888;font-size:13px">Questions? Reply to this email. — ScrewedScore Team</p>
                </div>
              `,
            }).catch(e => console.error('[audit email]', e))

            // Notify the owner (override with OWNER_ALERT_EMAIL in Netlify)
            await resend.emails.send({
              from:    process.env.RESEND_FROM_EMAIL ?? 'hello@screwedscore.com',
              to:      process.env.OWNER_ALERT_EMAIL || 'sledheadspl@gmail.com',
              subject: `New Human Audit — ${documentType} — ${scorePercent}% — $9.99`,
              html: `<p>New paid audit request.</p><p><b>Customer:</b> ${customerEmail}<br/><b>Document:</b> ${documentType}<br/><b>AI Score:</b> ${scorePercent}%<br/><b>Analysis ID:</b> ${analysisId}</p><p>Job has been added to the marketplace queue.</p>`,
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
        must(await supabase.from('revoked_subscriptions').upsert(
          { subscription_id: sub.id, reason: 'cancelled', revoked_at: new Date().toISOString() },
          { onConflict: 'subscription_id' }
        ), 'revoke subscription')
        must(await supabase
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('stripe_subscription_id', sub.id), 'update profile')
        // Deactivate only the ClipPilot license(s) bought with THIS subscription
        // (licenses are keyed by checkout session), not every license that
        // shares the customer's email.
        const sessions = await stripe.checkout.sessions.list({ subscription: sub.id, limit: 10 })
        const sessionIds = sessions.data.map(s => s.id)
        if (sessionIds.length > 0) {
          must(await supabase
            .from('clippilot_licenses')
            .update({ is_active: false })
            .in('stripe_session_id', sessionIds), 'deactivate clippilot license')
        }
        console.log('[stripe-webhook] Subscription cancelled:', sub.id)
        break
      }

      case 'invoice.payment_failed': {
        // Since API version 2025-03-31.basil the subscription lives under
        // invoice.parent.subscription_details (top-level invoice.subscription is gone).
        const invoice = event.data.object as Stripe.Invoice
        const subRef = invoice.parent?.subscription_details?.subscription
        const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id ?? null
        if (subscriptionId) {
          must(await supabase.from('revoked_subscriptions').upsert(
            { subscription_id: subscriptionId, reason: 'payment_failed', revoked_at: new Date().toISOString() },
            { onConflict: 'subscription_id' }
          ), 'revoke subscription')
          must(await supabase
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId), 'update profile')
          console.log('[stripe-webhook] Payment failed for subscription:', subscriptionId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        if (sub.status === 'active') {
          // Re-activate if previously revoked (e.g. payment recovered)
          must(await supabase
            .from('revoked_subscriptions')
            .delete()
            .eq('subscription_id', sub.id), 'un-revoke subscription')
          must(await supabase
            .from('profiles')
            .update({ subscription_status: 'active' })
            .eq('stripe_subscription_id', sub.id), 'update profile')
          console.log('[stripe-webhook] Subscription re-activated:', sub.id)
        }
        break
      }

      default:
        // Acknowledge unhandled event types without error
        break
    }
  } catch (err) {
    await logError('stripe-webhook', err, { event_type: event.type, event_id: event.id })
    // Release the idempotency claim so Stripe's retry is processed instead of
    // being skipped as a duplicate.
    await supabase.from('stripe_webhook_events').delete().eq('event_id', event.id)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
