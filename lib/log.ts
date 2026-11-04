/**
 * Lightweight error logger. Emails operator on critical failures so silent
 * production breakage gets noticed. No-deps fallback (uses fetch + Resend
 * REST), works in both Node and Edge runtimes.
 *
 * Usage:
 *   try { ... } catch (err) {
 *     await logError('stripe-webhook', err, { event: event.type })
 *     throw err
 *   }
 *
 * Set ALERT_EMAIL in env (defaults to sledheadspl@gmail.com — operator).
 * Throttled in-memory: each (scope, message) combo emails at most once per hour.
 */

const RESEND_API = 'https://api.resend.com/emails'
const ALERT_EMAIL_DEFAULT = 'sledheadspl@gmail.com'
const FROM_DEFAULT = 'alerts@screwedscore.com'
const THROTTLE_MS = 60 * 60 * 1000 // 1 hour

const lastSentByKey = new Map<string, number>()

function shouldThrottle(key: string): boolean {
  const last = lastSentByKey.get(key)
  if (last && Date.now() - last < THROTTLE_MS) return true
  lastSentByKey.set(key, Date.now())
  // Trim map if it grows
  if (lastSentByKey.size > 200) {
    const cutoff = Date.now() - THROTTLE_MS
    for (const [k, t] of lastSentByKey) if (t < cutoff) lastSentByKey.delete(k)
  }
  return false
}

export async function logError(
  scope: string,
  err: unknown,
  context: Record<string, unknown> = {}
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack ?? '' : ''

  // Always console.error so logs persist in Netlify function logs
  console.error(`[${scope}]`, message, context, stack)

  // Email on critical errors only — throttled per (scope, message)
  const key = `${scope}::${message}`.slice(0, 200)
  if (shouldThrottle(key)) return

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ALERT_EMAIL ?? ALERT_EMAIL_DEFAULT
  const from = process.env.RESEND_FROM_EMAIL ?? FROM_DEFAULT
  if (!apiKey) return

  const subject = `[ScrewedScore] ${scope}: ${message.slice(0, 80)}`
  const ctxJson = JSON.stringify(context, null, 2).slice(0, 2000)
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;color:#111;">
  <h2 style="color:#ef4444;margin:0 0 8px;">Production error: ${scope}</h2>
  <p style="margin:0 0 16px;color:#666;font-size:13px;">${new Date().toISOString()}</p>
  <pre style="background:#f5f5f5;border-left:3px solid #ef4444;padding:12px 16px;font-size:13px;overflow:auto;border-radius:4px;">${escapeHtml(message)}</pre>
  ${ctxJson !== '{}' ? `<p style="margin:16px 0 4px;font-weight:bold;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Context</p><pre style="background:#f5f5f5;padding:12px 16px;font-size:12px;overflow:auto;border-radius:4px;">${escapeHtml(ctxJson)}</pre>` : ''}
  ${stack ? `<p style="margin:16px 0 4px;font-weight:bold;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Stack</p><pre style="background:#f5f5f5;padding:12px 16px;font-size:11px;overflow:auto;border-radius:4px;">${escapeHtml(stack.slice(0, 4000))}</pre>` : ''}
  <p style="margin:24px 0 0;color:#999;font-size:11px;">Throttled to one email per (scope, message) per hour. Check Netlify function logs for full history.</p>
</div>`

  try {
    await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: `Alerts <${from}>`, to, subject, html }),
    })
  } catch {
    // Don't throw from the logger — never compound errors.
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!))
}
