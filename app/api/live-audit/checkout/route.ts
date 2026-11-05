import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { LIVE_AUDIT_AUDITOR, LIVE_AUDIT_OPTIONS, isLiveAuditFormat } from '@/lib/live-audit'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trim and cap a form field (Stripe metadata values max out at 500 chars). */
function field(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.screwedscore.com'
  const origin = req.headers.get('origin')
  const allowed = [site, site.replace('https://', 'https://www.'), site.replace('https://www.', 'https://')]
  if (origin && !allowed.includes(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const format = body.format
  if (!isLiveAuditFormat(format)) {
    return NextResponse.json({ error: 'Choose video call or in person.' }, { status: 400 })
  }
  const name     = field(body.name, 100)
  const email    = field(body.email, 200)
  const phone    = field(body.phone, 40)
  const location = field(body.location, 200)
  const times    = field(body.preferred_times, 400)
  const notes    = field(body.notes, 450)

  if (!name)                 return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  if (!phone)                return NextResponse.json({ error: 'Please enter a phone number so we can confirm a time.' }, { status: 400 })
  if (format === 'in_person' && !location) {
    return NextResponse.json({ error: 'Please enter your city or ZIP for an in-person audit.' }, { status: 400 })
  }

  const option = LIVE_AUDIT_OPTIONS[format]

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      customer_creation: 'always',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: option.priceCents,
          product_data: {
            name: `Live Bill & Finance Audit — ${option.label} (${option.minutes} min)`,
            description: `A ${option.minutes}-minute session with ${LIVE_AUDIT_AUDITOR} going through your bills, statements and contracts line by line. ${LIVE_AUDIT_AUDITOR} will contact you within 24 hours to confirm a time.`,
          },
        },
      }],
      metadata: {
        type: 'live_audit',
        format,
        name,
        phone,
        location,
        preferred_times: times,
        notes,
      },
      success_url: `${site}/live-audit/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${site}/live-audit`,
      allow_promotion_codes: true,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[live-audit/checkout]', err)
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
  }
}
