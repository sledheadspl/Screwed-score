import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

const PRODUCT_MAP: Record<string, { priceId: string; subscription: boolean }> = {
  'creator-os':               { priceId: 'price_1TOBsNEKDzEsz6UjOSSTcBF8', subscription: false },
  'content-pipeline':         { priceId: 'price_1TOBsNEKDzEsz6UjnlC4T1Gg', subscription: false },
  'brand-deal':               { priceId: 'price_1TOBsNEKDzEsz6UjNRge33ad', subscription: false },
  'revenue-dashboard':        { priceId: 'price_1TOBsOEKDzEsz6Uj6cuJsF81', subscription: false },
  'social-assets':            { priceId: 'price_1TOBsOEKDzEsz6UjK8FO2JGm', subscription: false },
  'launch-sequence':          { priceId: 'price_1TOBsPEKDzEsz6Uj9C2IBsDE', subscription: false },
  'ai-prompt-vault':          { priceId: 'price_1TOBsPEKDzEsz6Uj9i1fEh6K', subscription: false },
  'youtube-accelerator':      { priceId: 'price_1TOBsQEKDzEsz6UjBEtGvzSB', subscription: false },
  'email-list-builder':       { priceId: 'price_1TOBsQEKDzEsz6Uj1SkOunOo', subscription: false },
  'viral-content-formula':    { priceId: 'price_1TOBsQEKDzEsz6UjKe6xUmMn', subscription: false },
  'freelance-rate-kit':       { priceId: 'price_1TOBsREKDzEsz6UjEMtUfOfg', subscription: false },
  'personal-brand-kit':       { priceId: 'price_1TOBsREKDzEsz6UjTC6YTAk4', subscription: false },
  'creator-legal-toolkit':    { priceId: 'price_1TOBsSEKDzEsz6UjPowJACDo', subscription: false },
  'passive-income-blueprint': { priceId: 'price_1TOBsSEKDzEsz6UjxIRdcMlT', subscription: false },
  'video-script-formula':     { priceId: 'price_1TOBsTEKDzEsz6UjuCUofmzN', subscription: false },
  'course-creator-kit':       { priceId: 'price_1TOBsTEKDzEsz6UjwFYftZjL', subscription: false },
  'clippilot-pro':            { priceId: 'price_1TOBsTEKDzEsz6UjvlIWpNVO', subscription: true  },
  'clippilot-pro-yearly':     { priceId: 'price_1TOBsUEKDzEsz6UjnXVJq7om', subscription: true  },
  'clippilot-unlimited':      { priceId: 'price_1TOBsUEKDzEsz6UjtyQlLYaG', subscription: true  },
  'clippilot-unlimited-yearly': { priceId: 'price_1TOBsVEKDzEsz6Uj0QtpIXnc', subscription: true },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://screwedscore.com'

  const requestOrigin = req.headers.origin as string | undefined
  const allowedOrigins = [
    origin,
    origin.replace('https://', 'https://www.'),
    origin.replace('https://www.', 'https://'),
  ]
  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { product_id } = req.body as { product_id?: string }
  const entry = product_id ? PRODUCT_MAP[product_id] : null
  if (!entry) return res.status(400).json({ error: 'Invalid product_id' })

  const isClipPilot = product_id!.startsWith('clippilot')

  try {
    const session = await stripe.checkout.sessions.create({
      mode: entry.subscription ? 'subscription' : 'payment',
      line_items: [{ price: entry.priceId, quantity: 1 }],
      metadata: { product_id: product_id! },
      success_url: isClipPilot
        ? `${origin}/clippilot/success?product=${product_id}&session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/productivity/success?product=${product_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: isClipPilot ? `${origin}/clippilot#pricing` : `${origin}/productivity`,
      allow_promotion_codes: true,
      customer_creation: entry.subscription ? undefined : 'always',
    })

    return res.status(200).json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[product-checkout]', msg)
    return res.status(500).json({ error: msg })
  }
}
