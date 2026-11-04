import Stripe from 'stripe'

let _stripe: Stripe | null = null

/** Lazily-constructed Stripe client, so a missing key fails at request time, not build time. */
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
  }
  return _stripe
}

/**
 * True when a Checkout Session was completed and paid for (including a
 * 100%-off promotion code, which Stripe reports as `no_payment_required`).
 */
export function isPaidSession(session: Stripe.Checkout.Session): boolean {
  return (
    session.status === 'complete' &&
    (session.payment_status === 'paid' || session.payment_status === 'no_payment_required')
  )
}

/**
 * Counts uses of a purchase in its own Stripe metadata (no DB table needed).
 * A different `period` resets the count, e.g. each subscription renewal gets
 * a fresh allowance. Returns false, without writing, once `max` is reached.
 * Not atomic: two simultaneous requests can both pass, which is acceptable
 * for a soft cap.
 */
export async function recordUse(opts: {
  read: () => Promise<Stripe.Metadata>
  write: (metadata: Stripe.MetadataParam) => Promise<unknown>
  key: string
  period: string
  max: number
}): Promise<boolean> {
  const [storedPeriod, storedCount] = ((await opts.read())[opts.key] ?? '').split(':')
  const count = storedPeriod === opts.period ? parseInt(storedCount, 10) || 0 : 0
  if (count >= opts.max) return false
  await opts.write({ [opts.key]: `${opts.period}:${count + 1}` })
  return true
}
