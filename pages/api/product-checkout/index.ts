import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

const PRODUCT_MAP: Record<string, { priceId: string; subscription: boolean }> = {
  'creator-os':               { priceId: 'price_1TOCoPEKDzEsz6UjwGJfStP0', subscription: false },
  'content-pipeline':         { priceId: 'price_1TOCoPEKDzEsz6UjyjjqslgM', subscription: false },
  'brand-deal':               { priceId: 'price_1TOCoQEKDzEsz6UjCwjF7npU', subscription: false },
  'revenue-dashboard':        { priceId: 'price_1TOCoQEKDzEsz6Ujg4av6mRw', subscription: false },
  'social-assets':            { priceId: 'price_1TOCoQEKDzEsz6UjcEbRYf3b', subscription: false },
  'launch-sequence':          { priceId: 'price_1TOCoREKDzEsz6UjrAcmJA2v', subscription: false },
  'ai-prompt-vault':          { priceId: 'price_1TOCoREKDzEsz6UjDalV71xd', subscription: false },
  'youtube-accelerator':      { priceId: 'price_1TOCoSEKDzEsz6UjL9tGbd1T', subscription: false },
  'email-list-builder':       { priceId: 'price_1TOCoSEKDzEsz6UjVp4vnUM5', subscription: false },
  'viral-content-formula':    { priceId: 'price_1TOCoSEKDzEsz6Uj1w97GFhv', subscription: false },
  'freelance-rate-kit':       { priceId: 'price_1TOCoTEKDzEsz6Uj5gIq3lgf', subscription: false },
  'personal-brand-kit':       { priceId: 'price_1TOCoTEKDzEsz6UjvoEhzN0q', subscription: false },
  'creator-legal-toolkit':    { priceId: 'price_1TOCoUEKDzEsz6UjOkmgJNNw', subscription: false },
  'passive-income-blueprint': { priceId: 'price_1TOCoUEKDzEsz6UjBOSOMZkf', subscription: false },
  'video-script-formula':     { priceId: 'price_1TOCoVEKDzEsz6UjyODbDSd8', subscription: false },
  'course-creator-kit':       { priceId: 'price_1TOCoVEKDzEsz6UjzLb1zUmV', subscription: false },
  'clippilot-pro':            { priceId: 'price_1TOCoVEKDzEsz6UjRjrNbCKL', subscription: true  },
  'clippilot-pro-yearly':     { priceId: 'price_1TOCoWEKDzEsz6UjLJ68g3IZ', subscription: true  },
  'clippilot-unlimited':      { priceId: 'price_1TOCoWEKDzEsz6UjbPga14BI', subscription: true  },
  'clippilot-unlimited-yearly': { priceId: 'price_1TOCoXEKDzEsz6UjYMmOx1Qv', subscription: true },
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
