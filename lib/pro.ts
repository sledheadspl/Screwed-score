import { parseToken } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'

/**
 * Full server-side Pro check for a `gss_pro` cookie: signature + expiry, and
 * that the purchase behind it (subscription `sub_…` or one-time payment
 * `pi_…`) has not been revoked by the Stripe webhook (cancelled, payment
 * failed). Use this instead of a bare verifyToken() when gating paid features.
 */
export async function hasActivePro(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const parsed = parseToken(token)
  if (!parsed) return false
  if (!parsed.refId.startsWith('sub_') && !parsed.refId.startsWith('pi_')) return true

  try {
    const { data } = await createServiceClient()
      .from('revoked_subscriptions')
      .select('subscription_id')
      .eq('subscription_id', parsed.refId)
      .maybeSingle()
    return !data
  } catch {
    // Matches the upload route: favour access on a DB outage rather than
    // locking out paying users.
    return true
  }
}
