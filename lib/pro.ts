import { parseToken } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

/**
 * True when the gss_pro token is validly signed, unexpired, and the purchase
 * behind it has not been revoked. The Stripe webhook writes the payment
 * (pi_...) or subscription (sub_...) id to revoked_subscriptions when a
 * subscription is cancelled or fails to pay, or when a payment is refunded
 * or disputed.
 *
 * Fails open on a database error, matching the scan route, so an outage
 * doesn't lock out paying customers.
 */
export async function isProTokenActive(token: string | null | undefined): Promise<boolean> {
  if (!token) return false
  const parsed = parseToken(token)
  if (!parsed) return false
  return !(await isPurchaseRevoked(parsed.refId))
}

/** True when a payment or subscription id is listed in revoked_subscriptions. */
export async function isPurchaseRevoked(refId: string | null | undefined): Promise<boolean> {
  if (!refId) return false
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('revoked_subscriptions')
      .select('subscription_id')
      .eq('subscription_id', refId)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}
