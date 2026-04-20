import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

// Max 10 kit checkout attempts per IP per hour
const LIMIT     = 10
const WINDOW_MS = 60 * 60 * 1000

// Price in cents — override with KIT_PRICE_CENTS env var if needed
const KIT_PRICE_CENTS = parseInt(process.env.KIT_PRICE_CENTS ?? '1499', 10)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://screwedscore.com'

  const requestOrigin = req.headers.origin as string | undefined
  if (requestOrigin && requestOrigin !== origin) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Rate limit by IP
  const ip     = (req.headers['x-real-ip'] as string) ??
    (req.headers['cf-connecting-ip'] as string) ??
    (req.headers['x-forwarded-for'] as string)?.split(',').at(-1)?.trim() ??
    '0.0.0.0'
  const ipHash = createHash('sha256').update(`kit-checkout:${ip}`).digest('hex')

  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('ip_hash', ipHash)
      .maybeSingle()

    if (data) {
      const windowAge = Date.now() - new Date(data.window_start).getTime()
      if (windowAge < WINDOW_MS && data.request_count >= LIMIT) {
        return res.status(429).json({ error: 'Too many requests. Try again later.' })
      }
    }

    const now          = new Date().toISOString()
    const windowExpired = !data || Date.now() - new Date(data.window_start).getTime() >= WINDOW_MS
    await supabase.from('rate_limits').upsert(
      {
        ip_hash:       ipHash,
        request_count: windowExpired ? 1 : (data!.request_count + 1),
        window_start:  windowExpired ? now : data!.window_start,
        updated_at:    now,
      },
      { onConflict: 'ip_hash' }
    )
  } catch { /* non-fatal — don't block checkout on DB error */ }

  const { analysis_id } = req.body as { analysis_id?: string }
  if (!analysis_id || typeof analysis_id !== 'string') {
    return res.status(400).json({ error: 'analysis_id required' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: 'price_1TOCoOEKDzEsz6UjaBxluF1Z', quantity: 1 }],
      metadata: { analysis_id },
      success_url: `${origin}/r/${analysis_id}?kit_session={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/`,
      allow_promotion_codes: true,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[kit-checkout]', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
