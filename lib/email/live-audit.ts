import type Stripe from 'stripe'
import { Resend } from 'resend'
import { LIVE_AUDIT_AUDITOR, LIVE_AUDIT_OPTIONS, formatPrice, isLiveAuditFormat } from '@/lib/live-audit'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Called from the Stripe webhook after a live audit is paid.
 * The owner notification is required: if it fails this throws, so the
 * webhook returns 500 and Stripe retries. The customer confirmation is
 * best-effort and only logged on failure.
 */
export async function sendLiveAuditEmails(session: Stripe.Checkout.Session): Promise<void> {
  const md = session.metadata ?? {}
  const format = isLiveAuditFormat(md.format) ? md.format : 'video'
  const option = LIVE_AUDIT_OPTIONS[format]
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? ''
  const name = md.name || 'there'
  const paid = formatPrice(session.amount_total ?? option.priceCents)

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL ?? 'hello@screwedscore.com'
  const owner = process.env.OWNER_ALERT_EMAIL || 'sledheadspl@gmail.com'

  const rows: Array<[string, string]> = [
    ['Format', `${option.label} (${option.minutes} min)`],
    ['Paid', paid],
    ['Name', md.name ?? ''],
    ['Email', customerEmail],
    ['Phone', md.phone ?? ''],
    ['Location', md.location || '—'],
    ['Preferred times', md.preferred_times || '—'],
    ['What to review', md.notes || '—'],
    ['Stripe session', session.id],
  ]

  const ownerResult = await resend.emails.send({
    from,
    to: owner,
    replyTo: customerEmail || undefined,
    subject: `New live audit booked: ${option.label}, ${paid}, ${md.name ?? 'customer'}`,
    html: `<div style="font-family:sans-serif;max-width:560px;color:#111">
      <h2 style="margin:0 0 12px">New live audit booked</h2>
      <p>Contact them within 24 hours to confirm a time. Reply to this email to write to the customer.</p>
      <table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#666;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(v)}</td></tr>`
      ).join('')}</table>
    </div>`,
  })
  if (ownerResult.error) {
    throw new Error(`live audit owner email failed: ${ownerResult.error.message}`)
  }

  if (!customerEmail) return
  const customerResult = await resend.emails.send({
    from,
    to: customerEmail,
    replyTo: owner,
    subject: `Your live audit is booked. ${LIVE_AUDIT_AUDITOR} will be in touch within 24 hours`,
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="color:#ff3b30">You're booked, ${escapeHtml(name)}.</h2>
      <p>Thanks for booking a <strong>${option.minutes}-minute ${option.label.toLowerCase()} audit</strong> (${paid}).</p>
      <p><strong>What happens next:</strong> ${LIVE_AUDIT_AUDITOR} will call or email you within 24 hours to lock in a time${format === 'in_person' ? ' and place' : ' and send a video link'}.</p>
      <p><strong>Before we meet</strong>, gather what you'd like reviewed: recent bills, bank and credit card statements, medical or insurance paperwork, subscriptions, contracts, or repair estimates. Paper or screenshots are both fine.</p>
      <p>Questions or need to change something? Just reply to this email.</p>
      <p style="color:#888;font-size:13px;margin-top:24px">ScrewedScore · screwedscore.com</p>
    </div>`,
  })
  if (customerResult.error) {
    console.error('[live-audit] customer confirmation failed', customerResult.error)
  }
}
