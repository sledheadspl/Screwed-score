import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase'

// Validate required environment variables at module load — fail fast
if (!process.env.GSS_TOKEN_SECRET) {
  throw new Error('GSS_TOKEN_SECRET environment variable is required')
}
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
})

function issueToken(customerId: string, subscriptionId: string): string {
  const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 32 // ~32 days
  const payload = `${customerId}:${subscriptionId}:${expiry}`
  const sig = createHmac('sha256', process.env.GSS_TOKEN_SECRET!)
    .update(payload)
    .digest('hex')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

/**
 * Verifies a gss_pro JWT cookie.
 * Returns the subscriptionId string if valid and unexpired, or false if invalid.
 */
export function verifyToken(token: string): string | false {
  try {
    const [b64, sig] = token.split('.')
    if (!b64 || !sig) return false

    const payload = Buffer.from(b64, 'base64url').toString()
    const expected = createHmac('sha256', process.env.GSS_TOKEN_SECRET!)
      .update(payload)
      .digest('hex')

    // Timing-safe comparison — prevents timing side-channel attacks
    const sigBuf = Buffer.from(sig, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return false
    if (!timingSafeEqual(sigBuf, expBuf)) return false

    const parts = payload.split(':')
    const expiry = parseInt(parts[2] ?? '0', 10)
    if (Date.now() / 1000 >= expiry) return false

    const subscriptionId = parts[1] ?? ''
    return subscriptionId || false
  } catch {
    return false
  }
}

// POST — changed from GET to prevent CSRF via img/link tags setting cookies
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({}))
    const sessionId = body?.session_id

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })
    }

    const customerId = session.customer as string
    const subscriptionId = session.subscription as string
    const token = issueToken(customerId, subscriptionId)

    // Best-effort: link subscription to user profile if they have one
    if (session.customer_email) {
      try {
        const supabase = createServiceClient()
        await supabase
          .from('profiles')
          .update({
            stripe_customer_id:     customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status:    'active',
          })
          .eq('email', session.customer_email)
      } catch (err) {
        console.warn('[verify-checkout] Profile update failed (non-fatal):', err)
      }
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set('gss_pro', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 32,
    })
    return res
  } catch (err) {
    console.error('[verify-checkout]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
