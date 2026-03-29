import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createHmac } from 'crypto'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

function issueToken(customerId: string, subscriptionId: string): string {
  const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 32 // ~32 days
  const payload = `${customerId}:${subscriptionId}:${expiry}`
  const sig = createHmac('sha256', process.env.GSS_TOKEN_SECRET!)
    .update(payload)
    .digest('hex')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })
    }

    const customerId = typeof session.customer === 'string' ? session.customer : null
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null

    if (!customerId || !subscriptionId) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 })
    }

    const token = issueToken(customerId, subscriptionId)

    const res = NextResponse.json({ ok: true })
    res.cookies.set('gss_pro', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days — short TTL, renewal handled by webhook
    })
    return res
  } catch (err) {
    console.error('[verify-checkout]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
