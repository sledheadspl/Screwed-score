import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
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

  const { email, html, label } = body as { email: string; html: string; label: string }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
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
    ${html}
    <div class="footer">
      Sent via <a href="https://screwedscore.com/create" style="color:#555;">GetScrewedScore.com Document Creator</a>
    </div>
  </div>
</body>
</html>`

  const resend = getResend()

  const { error } = await resend.emails.send({
    from: 'GetScrewedScore <docs@screwedscore.com>',
    to: email,
    subject: `Your ${label} — GetScrewedScore`,
    html: emailHtml,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
