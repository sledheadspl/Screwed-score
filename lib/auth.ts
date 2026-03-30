import { createHmac } from 'crypto'

/**
 * Issues an HMAC-signed token encoding the Stripe customer + subscription IDs.
 * @param ttlDays  How long until the token expires (default 32 days).
 */
export function issueToken(
  customerId: string,
  subscriptionId: string,
  ttlDays = 32
): string {
  const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * ttlDays
  const payload = `${customerId}:${subscriptionId}:${expiry}`
  const sig = createHmac('sha256', process.env.GSS_TOKEN_SECRET!)
    .update(payload)
    .digest('hex')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
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
    if (sig !== expected) return false
    const expiry = parseInt(payload.split(':')[2] ?? '0', 10)
    return Date.now() / 1000 < expiry
  } catch {
    return false
  }
}
