import Stripe from 'stripe'

/**
 * Lazily constructed Stripe client.
 *
 * Constructing Stripe at module scope ran during Next's build-time page-data
 * collection and threw when STRIPE_SECRET_KEY was absent, so a fresh clone or
 * a CI job without production secrets could not build the site at all. The
 * proxy defers construction to the first real call inside a request handler,
 * where a missing key surfaces as that request's error instead of a build
 * failure. Call sites use `stripe.checkout.sessions.create(...)` unchanged.
 */
let client: Stripe | null = null

function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    client = new Stripe(key, { apiVersion: '2026-03-25.dahlia' })
  }
  return client
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return Reflect.get(getStripe(), prop)
  },
})
