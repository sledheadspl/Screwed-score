import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { allowRequest, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.screwedscore.com'
const ALLOWED_ORIGINS = new Set([
  SITE,
  SITE.replace('https://', 'https://www.'),
  SITE.replace('https://www.', 'https://'),
])
const MAX_HTML_BYTES = 200_000

// Drop scripts, iframes, forms and inline event handlers from the document
// body. Email clients block most of this anyway; this keeps the route from
// relaying active content under our domain.
function stripActiveContent(html: string) {
  return html
    .replace(/<\s*(script|iframe|object|embed|form|meta|link|base)[\s\S]*?(<\s*\/\s*\1\s*>|\/?>)/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')?\s*javascript:[^"'>\s]*/gi, '$1=$2#')
}

// Basic email validator
function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.email || !body?.html || !body?.label) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Only the site's own Document Creator may call this.
  const origin = req.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, html, label } = body as { email: string; html: string; label: string }

  if (typeof email !== 'string' || typeof html !== 'string' || typeof label !== 'string') {
    return NextResponse.json({ error: 'Invalid fields' }, { status: 400 })
  }
  if (Buffer.byteLength(html) > MAX_HTML_BYTES || label.length > 120 || email.length > 254) {
    return NextResponse.json({ error: 'Document too large' }, { status: 413 })
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  // 5 sends per IP per hour, 3 per recipient per day.
  const ip = clientIp(req.headers)
  const recipient = email.trim().toLowerCase()
  if (
    !(await allowRequest('send-doc-ip', ip, 5, 60 * 60 * 1000)) ||
    !(await allowRequest('send-doc-to', recipient, 3, 24 * 60 * 60 * 1000))
  ) {
    return NextResponse.json({ error: 'Too many emails. Try again later.' }, { status: 429 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 20px; background: #f5f5f0; font-family: Georgia, serif; }
    .wrapper { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    ${stripActiveContent(html)}
    <div class="footer">
      Sent via <a href="https://www.screwedscore.com/create" style="color:#555;">GetScrewedScore.com Document Creator</a>
    </div>
  </div>
</body>
</html>`

  const resend = getResend()

  const { error } = await resend.emails.send({
    from: 'GetScrewedScore <docs@screwedscore.com>',
    to: recipient,
    subject: `Your ${label.replace(/[\r\n]/g, ' ')} — GetScrewedScore`,
    html: emailHtml,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
