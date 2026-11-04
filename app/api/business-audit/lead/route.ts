import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { logError } from '@/lib/log'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const OPERATOR_EMAIL = process.env.ALERT_EMAIL ?? 'sledheadspl@gmail.com'

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!))
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const name          = String(body.name          ?? '').trim().slice(0, 100)
    const business      = String(body.business      ?? '').trim().slice(0, 200)
    const email         = String(body.email         ?? '').trim().toLowerCase().slice(0, 254)
    const phone         = String(body.phone         ?? '').trim().slice(0, 40)
    const industry      = String(body.industry      ?? '').trim().slice(0, 80)
    const monthly_bills = String(body.monthly_bills ?? '').trim().slice(0, 80)
    const message       = String(body.message       ?? '').trim().slice(0, 1500)

    if (!name || !business || !email) {
      return NextResponse.json({ error: 'Name, business, and email are required.' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      await logError('business-audit-lead', new Error('RESEND_API_KEY not set'), { email })
      return NextResponse.json({ error: 'Mail service not configured.' }, { status: 500 })
    }
    const resend = new Resend(apiKey)
    const from = process.env.RESEND_FROM_EMAIL ?? 'hello@screwedscore.com'

    const operatorHtml = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <h2 style="margin:0 0 8px;color:#16a34a;">New B2B audit lead</h2>
  <p style="margin:0 0 16px;color:#666;font-size:13px;">${new Date().toISOString()}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:6px 0;color:#666;width:140px;">Name</td><td style="padding:6px 0;color:#111;font-weight:600;">${escapeHtml(name)}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Business</td><td style="padding:6px 0;color:#111;font-weight:600;">${escapeHtml(business)}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Industry</td><td style="padding:6px 0;color:#111;">${escapeHtml(industry || '—')}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#2563eb;">${escapeHtml(email)}</a></td></tr>
    <tr><td style="padding:6px 0;color:#666;">Phone</td><td style="padding:6px 0;">${phone ? `<a href="tel:${escapeHtml(phone)}" style="color:#2563eb;">${escapeHtml(phone)}</a>` : '—'}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">Monthly bills</td><td style="padding:6px 0;">${escapeHtml(monthly_bills || '—')}</td></tr>
  </table>
  ${message ? `<div style="margin-top:16px;padding:12px 16px;background:#f5f5f5;border-left:3px solid #4ade80;border-radius:4px;font-size:14px;color:#444;white-space:pre-wrap;">${escapeHtml(message)}</div>` : ''}
  <p style="margin-top:24px;font-size:12px;color:#999;">Reply to this email to reach the lead — or click the email/phone above.</p>
</div>`

    const leadHtml = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#111;">
  <h2 style="margin:0 0 12px;color:#111;">Got your audit request, ${escapeHtml(name.split(' ')[0])}.</h2>
  <p style="font-size:15px;line-height:1.6;color:#333;">Quick recap of what happens next:</p>
  <ol style="font-size:14px;line-height:1.7;color:#444;padding-left:20px;">
    <li>We&rsquo;ll review what you sent over within <strong>24 hours</strong>.</li>
    <li>If your bill volume is in our wheelhouse, we&rsquo;ll reply with a 1&ndash;2 minute video showing the obvious leaks we already spotted.</li>
    <li>If it looks like there&rsquo;s real money on the table, we&rsquo;ll send a payment link and start the full 48-hour audit.</li>
    <li>If it doesn&rsquo;t pencil out for you, we&rsquo;ll tell you straight &mdash; no pitch.</li>
  </ol>
  <p style="font-size:14px;line-height:1.6;color:#444;">Reply to this email anytime. &mdash; the ScrewedScore team</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
  <p style="font-size:12px;color:#999;">ScrewedScore &middot; screwedscore.com</p>
</div>`

    // Operator notification — fire-and-forget, but log failures so we know.
    await resend.emails.send({
      from,
      to:      OPERATOR_EMAIL,
      subject: `[B2B Audit] ${business} — ${industry || 'unspecified'}`,
      html:    operatorHtml,
      replyTo: email,
    }).catch(async err => {
      await logError('business-audit-lead/operator-email', err, { email, business })
    })

    // Lead confirmation
    await resend.emails.send({
      from,
      to:      email,
      subject: 'Got your audit request — what happens next',
      html:    leadHtml,
    }).catch(async err => {
      await logError('business-audit-lead/lead-email', err, { email })
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    await logError('business-audit-lead', err)
    return NextResponse.json({ error: 'Failed to submit. Try again or email sledheadspl@gmail.com.' }, { status: 500 })
  }
}
