import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Issues an HMAC-signed token encoding the Stripe customer + payment IDs.
 * @param ttlDays  How long until the token expires (default 32 days).
 */
export function issueToken(
  customerId: string,
  paymentId: string,
  ttlDays = 32
): string {
  const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * ttlDays
  const payload = `${customerId}:${paymentId}:${expiry}`
  const sig = createHmac('sha256', process.env.GSS_TOKEN_SECRET!)
    .update(payload)
    .digest('hex')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

/**
 * Verifies signature + expiry and returns the token's parts, or null if invalid.
 * `refId` is a payment_intent id (pi_...) for one-time passes, or a
 * subscription id (sub_...) for Pro memberships — callers gating long-lived
 * subscription tokens should check sub_ ids against `revoked_subscriptions`.
 */
export function parseToken(token: string): { customerId: string; refId: string; expiry: number } | null {
  if (!verifyToken(token)) return null
  try {
    const payload = Buffer.from(token.split('.')[0], 'base64url').toString()
    const [customerId, refId, expiry] = payload.split(':')
    return { customerId, refId, expiry: parseInt(expiry, 10) }
  } catch {
    return null
  }
}

/** Returns true if the token signature is valid and the token has not expired. */
export function verifyToken(token: string): boolean {
  try {
    const [b64, sig] = token.split('.')
    if (!b64 || !sig) return false
    const payload = Buffer.from(b64, 'base64url').toString()
    const expected = createHmac('sha256', process.env.GSS_TOKEN_SECRET!)
      .update(payload)
      .digest('hex')
    // Timing-safe comparison to prevent timing attacks
    const sigBuf = Buffer.from(sig, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    if (!timingSafeEqual(sigBuf, expBuf)) return false
    const expiry = parseInt(payload.split(':')[2] ?? '0', 10)
    return Date.now() / 1000 < expiry
  } catch {
    return false
  }
}
