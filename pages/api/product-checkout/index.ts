import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

const PRODUCT_MAP: Record<string, { priceEnvKey: string; subscription: boolean }> = {
  'creator-os':              { priceEnvKey: 'STRIPE_PRICE_CREATOR_OS',                subscription: false },
  'content-pipeline':        { priceEnvKey: 'STRIPE_PRICE_CONTENT_PIPELINE',           subscription: false },
  'brand-deal':              { priceEnvKey: 'STRIPE_PRICE_BRAND_DEAL',                 subscription: false },
  'revenue-dashboard':       { priceEnvKey: 'STRIPE_PRICE_REVENUE_DASHBOARD',          subscription: false },
  'social-assets':           { priceEnvKey: 'STRIPE_PRICE_SOCIAL_ASSETS',              subscription: false },
  'launch-sequence':         { priceEnvKey: 'STRIPE_PRICE_LAUNCH_SEQUENCE',            subscription: false },
  'ai-prompt-vault':         { priceEnvKey: 'STRIPE_PRICE_AI_PROMPT_VAULT',            subscription: false },
  'youtube-accelerator':     { priceEnvKey: 'STRIPE_PRICE_YOUTUBE_ACCELERATOR',        subscription: false },
  'email-list-builder':      { priceEnvKey: 'STRIPE_PRICE_EMAIL_LIST_BUILDER',         subscription: false },
  'viral-content-formula':   { priceEnvKey: 'STRIPE_PRICE_VIRAL_CONTENT',              subscription: false },
  'freelance-rate-kit':      { priceEnvKey: 'STRIPE_PRICE_FREELANCE_RATE',             subscription: false },
  'personal-brand-kit':      { priceEnvKey: 'STRIPE_PRICE_PERSONAL_BRAND',             subscription: false },
  'creator-legal-toolkit':   { priceEnvKey: 'STRIPE_PRICE_CREATOR_LEGAL',              subscription: false },
  'passive-income-blueprint':{ priceEnvKey: 'STRIPE_PRICE_PASSIVE_INCOME',             subscription: false },
  'video-script-formula':    { priceEnvKey: 'STRIPE_PRICE_VIDEO_SCRIPT',               subscription: false },
  'course-creator-kit':      { priceEnvKey: 'STRIPE_PRICE_COURSE_CREATOR',             subscription: false },
  'clippilot-pro':           { priceEnvKey: 'CLIPPILOT_PRO_MONTHLY_PRICE_ID',          subscription: true  },
  'clippilot-pro-yearly':    { priceEnvKey: 'CLIPPILOT_PRO_YEARLY_PRICE_ID',           subscription: true  },
  'clippilot-unlimited':     { priceEnvKey: 'CLIPPILOT_UNLIMITED_MONTHLY_PRICE_ID',    subscription: true  },
  'clippilot-unlimited-yearly': { priceEnvKey: 'CLIPPILOT_UNLIMITED_YEARLY_PRICE_ID', subscription: true  },
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

  const priceId = process.env[entry.priceEnvKey]
  if (!priceId) return res.status(500).json({ error: `Price not configured for ${product_id}` })

  const isClipPilot = product_id!.startsWith('clippilot')

  try {
    const session = await stripe.checkout.sessions.create({
      mode: entry.subscription ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
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
