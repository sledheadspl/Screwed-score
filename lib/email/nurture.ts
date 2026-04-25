import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'hello@screwedscore.com'

// ── Step config: hours until next email after the previous step ─────────────
//   step 0 → after 24h send email 1, then advance to step 1
//   step 1 → after 48h send email 2, then advance to step 2
//   step 2 → after 96h send email 3, then advance to step 3 (done)
export const NURTURE_DELAYS_HOURS = [24, 48, 96] as const

const SHELL = (title: string, accent: string, body: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="padding-bottom:32px;text-align:center;">
  <span style="font-size:20px;font-weight:900;color:#f2f2f2;">Get</span><span style="font-size:20px;font-weight:900;background:linear-gradient(135deg,#ff6b60,#ff3b30);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Screwed</span><span style="font-size:20px;font-weight:900;color:#f2f2f2;">Score</span>
</td></tr>
<tr><td style="background:rgba(15,15,15,0.85);border:1px solid rgba(255,255,255,0.06);border-radius:20px;overflow:hidden;">
<tr><td style="height:3px;background:linear-gradient(90deg,${accent}00,${accent},${accent}00);"></td></tr>
<tr><td style="padding:36px 32px;color:#e5e5e5;font-size:15px;line-height:1.6;">
${body}
</td></tr></table>
<tr><td style="padding:20px 0 0;text-align:center;">
<p style="margin:0;font-size:11px;color:rgba(242,242,242,0.25);">
ScrewedScore · <a href="https://screwedscore.com" style="color:rgba(242,242,242,0.4);text-decoration:none;">screwedscore.com</a><br/>
You're receiving this because you opted in. <a href="https://screwedscore.com" style="color:rgba(242,242,242,0.4);">Visit the site</a> to manage preferences.
</p></td></tr>
</table></td></tr></table></body></html>`

const CTA = (label: string, href: string, accent: string) => `
<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
<td style="border-radius:10px;background:linear-gradient(135deg,${accent}22,${accent}08);border:1px solid ${accent}44;">
<a href="${href}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:${accent};text-decoration:none;letter-spacing:0.02em;">${label} →</a>
</td></tr></table>`

// ── Step 1 (Day 1): soft check-in ────────────────────────────────────────────
function buildStep1(): { subject: string; html: string } {
  const accent = '#ff3b30'
  const body = `
<p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${accent};letter-spacing:0.2em;text-transform:uppercase;">Day 1</p>
<h1 style="margin:0 0 14px;font-size:24px;font-weight:900;color:#f2f2f2;letter-spacing:-0.02em;line-height:1.15;">Did you actually look at your last bill?</h1>
<p style="margin:0 0 14px;">Most people don't. The average American overpays $1,300/year on bills they never read — mechanic invoices, medical bills, phone bills, contractor estimates. Every single one.</p>
<p style="margin:0 0 14px;">If you've got one sitting in your inbox or glove box right now, this is your nudge. It takes 20 seconds.</p>
${CTA('Scan a bill now (free)', 'https://screwedscore.com', accent)}
<p style="margin:0;font-size:13px;color:rgba(242,242,242,0.5);">No account. No credit card. We delete the file after we read it.</p>`
  return { subject: 'Quick gut check on that last bill', html: SHELL('Day 1', accent, body) }
}

// ── Step 2 (Day 3): value content ────────────────────────────────────────────
function buildStep2(): { subject: string; html: string } {
  const accent = '#f59e0b'
  const body = `
<p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${accent};letter-spacing:0.2em;text-transform:uppercase;">Day 3 · Value drop</p>
<h1 style="margin:0 0 14px;font-size:24px;font-weight:900;color:#f2f2f2;letter-spacing:-0.02em;line-height:1.15;">5 charges businesses bury and hope you never read</h1>
<p style="margin:0 0 16px;color:rgba(242,242,242,0.7);">These are the line items our AI flags most often. Memorize them.</p>

<div style="border-left:3px solid ${accent};padding-left:14px;margin-bottom:18px;">
  <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px;">1 — Vague labor lines</p>
  <p style="margin:0;font-size:14px;color:rgba(242,242,242,0.7);">"Diagnostic & repair (3 hrs)" with no breakdown. Demand an itemized list of exactly what was done, then verify the labor rate against your shop's posted rate (which they're legally required to display).</p>
</div>

<div style="border-left:3px solid ${accent};padding-left:14px;margin-bottom:18px;">
  <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px;">2 — "Shop supplies" / "miscellaneous"</p>
  <p style="margin:0;font-size:14px;color:rgba(242,242,242,0.7);">Pure padding. Most states cap or prohibit these as separate charges. Refuse to pay until they justify it line by line.</p>
</div>

<div style="border-left:3px solid ${accent};padding-left:14px;margin-bottom:18px;">
  <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px;">3 — Same service, two names</p>
  <p style="margin:0;font-size:14px;color:rgba(242,242,242,0.7);">"Blood draw" and "venipuncture." "Consultation" and "evaluation." Same thing, billed twice. Search every line item for synonyms.</p>
</div>

<div style="border-left:3px solid ${accent};padding-left:14px;margin-bottom:18px;">
  <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px;">4 — Facility fees on doctor visits</p>
  <p style="margin:0;font-size:14px;color:rgba(242,242,242,0.7);">If your "doctor's office" is owned by a hospital system, expect a $200–$800 surprise facility fee. Always ask before booking: "Is this billed as a hospital outpatient department?"</p>
</div>

<div style="border-left:3px solid ${accent};padding-left:14px;margin-bottom:24px;">
  <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1px;">5 — Auto-renewed add-ons</p>
  <p style="margin:0;font-size:14px;color:rgba(242,242,242,0.7);">Phone "device protection," cable "premium support," gym "towel service." Things you may have agreed to once, billed forever. Audit every line of every recurring bill annually.</p>
</div>

${CTA('Scan a bill — find your own', 'https://screwedscore.com', accent)}`
  return { subject: '5 charges businesses bury (and how to find them)', html: SHELL('Day 3', accent, body) }
}

// ── Step 3 (Day 7): community proof + final CTA ──────────────────────────────
function buildStep3(): { subject: string; html: string } {
  const accent = '#22c55e'
  const body = `
<p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${accent};letter-spacing:0.2em;text-transform:uppercase;">Day 7 · Final note</p>
<h1 style="margin:0 0 14px;font-size:24px;font-weight:900;color:#f2f2f2;letter-spacing:-0.02em;line-height:1.15;">One last nudge.</h1>
<p style="margin:0 0 14px;">This is the last email in this sequence. After this, we only message you if there's something genuinely useful — a new product, a public Wall of Shame update, or something we built specifically for what you signed up for.</p>
<p style="margin:0 0 14px;">If you came here because you suspected you were being overcharged on something, that suspicion was probably right. <strong>78% of the bills our AI scans flag at least one suspicious charge.</strong></p>
<p style="margin:0 0 14px;">If you found this useful, the single most helpful thing you can do is share one scan with a friend. Their first one is free.</p>
${CTA('Scan a bill', 'https://screwedscore.com', accent)}
<p style="margin:0;font-size:13px;color:rgba(242,242,242,0.5);">Thanks for being here. — Ryan, REMbyDesign</p>`
  return { subject: 'One last nudge', html: SHELL('Day 7', accent, body) }
}

const STEP_BUILDERS = [buildStep1, buildStep2, buildStep3] as const

export async function sendNurtureStep(
  email: string,
  step: 0 | 1 | 2
): Promise<{ ok: boolean; error?: string }> {
  const builder = STEP_BUILDERS[step]
  if (!builder) return { ok: false, error: `Invalid step: ${step}` }
  const { subject, html } = builder()

  try {
    const { error } = await getResend().emails.send({
      from: `ScrewedScore <${FROM}>`,
      to: email,
      subject,
      html,
    })
    if (error) {
      console.error('[nurture] Resend error:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
