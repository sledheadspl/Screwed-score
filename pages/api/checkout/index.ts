import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

// Max 10 checkout attempts per IP per hour
const CHECKOUT_LIMIT = 10
const CHECKOUT_WINDOW_MS = 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit by IP
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? '0.0.0.0'
  const ipHash = createHash('sha256').update(`checkout:${ip}`).digest('hex')

  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('rate_limits')
      .select('analyses_count, window_start')
      .eq('ip_hash', ipHash)
      .maybeSingle()

    if (data) {
      const windowAge = Date.now() - new Date(data.window_start).getTime()
      if (windowAge < CHECKOUT_WINDOW_MS && data.analyses_count >= CHECKOUT_LIMIT) {
        return res.status(429).json({ error: 'Too many requests. Try again later.' })
      }
    }

    const now = new Date().toISOString()
    const windowExpired = !data || Date.now() - new Date(data.window_start).getTime() >= CHECKOUT_WINDOW_MS
    await supabase.from('rate_limits').upsert(
      {
        ip_hash:        ipHash,
        analyses_count: windowExpired ? 1 : (data!.analyses_count + 1),
        window_start:   windowExpired ? now : data!.window_start,
        updated_at:     now,
      },
      { onConflict: 'ip_hash' }
    )
  } catch { /* non-fatal — don't block checkout on DB error */ }

  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (req.headers.origin as string | undefined) ??
      'https://screwedscore.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: process.env.GSS_STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${origin}/paid?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/`,
      allow_promotion_codes: true,
      customer_creation:     'always',
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[checkout]', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
