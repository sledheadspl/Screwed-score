import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const GUIDE_HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

  <!-- Header -->
  <div style="background:#020308;padding:32px 40px 24px">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#ff3b30;text-transform:uppercase">ScrewedScore</p>
    <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;line-height:1.3">5 Charges on Medical Bills That Hospitals Hope You Never Notice</h1>
  </div>

  <!-- Intro -->
  <div style="padding:28px 40px 0">
    <p style="margin:0;font-size:15px;color:#444;line-height:1.7">The average medical bill contains at least one error. Most people never find it — not because they're not smart enough, but because hospitals count on you not knowing what to look for. Here's what to look for.</p>
  </div>

  <!-- Items -->
  <div style="padding:24px 40px">

    <div style="border-left:3px solid #ff3b30;padding-left:16px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#ff3b30;text-transform:uppercase;letter-spacing:1px">1 — Upcoding</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111">You had a 15-minute checkup. They billed for a 45-minute comprehensive exam.</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.7">Hospitals assign billing codes to every service. "Upcoding" means they assign a higher-complexity code than the service warrants — and charge accordingly. Request the CPT codes on your bill, then look each one up at cms.gov. If the description doesn't match what actually happened, dispute it in writing.</p>
    </div>

    <div style="border-left:3px solid #ff3b30;padding-left:16px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#ff3b30;text-transform:uppercase;letter-spacing:1px">2 — Unbundling</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111">One procedure gets split into 4 line items — each billed separately.</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.7">Many services are supposed to be billed as a single bundled code at one price. Unbundling breaks them into components and bills each one individually — often 2–3x the correct amount. This is especially common with lab work and surgical procedures. If you see 4 charges for what felt like one thing, flag it.</p>
    </div>

    <div style="border-left:3px solid #ff3b30;padding-left:16px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#ff3b30;text-transform:uppercase;letter-spacing:1px">3 — Facility Fees</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111">You went to a "doctor's office." It was technically hospital property. Surprise: $600 facility fee.</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.7">Hospitals have been buying up private practices for years. When they do, they reclassify the location as a hospital outpatient department — which means they can charge a facility fee on top of the doctor's fee for every single visit. This is legal, rarely disclosed upfront, and routinely hits $200–$800 per visit. Always ask before your appointment: "Is this location billed as a hospital outpatient department?"</p>
    </div>

    <div style="border-left:3px solid #ff3b30;padding-left:16px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#ff3b30;text-transform:uppercase;letter-spacing:1px">4 — Duplicate Charges</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111">"Blood draw" and "venipuncture" are the same thing. Billed twice.</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.7">Hospitals use billing software that sometimes generates duplicate line items under slightly different names. "Room and board" and "inpatient accommodation." "Consultation" and "evaluation and management." Scan every line item for services that sound like the same thing. If you find one, you're almost certainly right — and you don't have to pay it twice.</p>
    </div>

    <div style="border-left:3px solid #ff3b30;padding-left:16px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#ff3b30;text-transform:uppercase;letter-spacing:1px">5 — Services Never Rendered</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111">You were billed for a physical therapy session that never happened.</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.7">It happens more often than hospitals will admit. A scheduled service gets entered into the billing system before it occurs — and then nobody removes it when it doesn't happen. Ask for your medical records alongside your bill. If a service appears on the bill but not in your records, that's fraud. Report it to your state attorney general and the service gets removed, usually immediately.</p>
    </div>

    <!-- Bonus -->
    <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin-bottom:24px">
      <p style="margin:0 0 6px;font-size:13px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:1px">Bonus: The Itemized Bill Rule</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.7">In most states, you have the legal right to request an itemized bill — every single charge, line by line. Hospitals must provide it within 30 days. If they can't or won't, you may not be legally obligated to pay. Always, always request the itemized version before you pay anything.</p>
    </div>

  </div>

  <!-- CTA -->
  <div style="padding:0 40px 32px;text-align:center">
    <p style="margin:0 0 16px;font-size:14px;color:#555">Now scan your own bill — the AI finds these exact issues automatically.</p>
    <a href="https://screwedscore.com" style="display:inline-block;background:#ff3b30;color:#fff;font-weight:800;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">Scan My Bill Free →</a>
    <p style="margin:16px 0 0;font-size:12px;color:#aaa">Or upgrade to a Human Audit — a real expert reviews your bill within 48 hours for $9.99.</p>
  </div>

  <!-- Footer -->
  <div style="background:#f0f0f0;padding:16px 40px;text-align:center">
    <p style="margin:0;font-size:12px;color:#999">ScrewedScore · screwedscore.com · You're receiving this because you requested our free guide.</p>
  </div>

</div>
</body>
</html>
`

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null)
    if (!body?.email || typeof body.email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const email = body.email.toLowerCase().trim()
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    // Store in waitlist
    const supabase = createServiceClient()
    await supabase.from('waitlist')
      .upsert({ email, source: 'exit_intent_guide' }, { onConflict: 'email', ignoreDuplicates: true })

    // Send guide email
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL ?? 'hello@screwedscore.com',
      to:      email,
      subject: '5 charges on medical bills that hospitals hope you never notice',
      html:    GUIDE_HTML,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[guide]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
