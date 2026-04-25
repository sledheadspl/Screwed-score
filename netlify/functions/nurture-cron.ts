import type { Config } from '@netlify/functions'

// Hits /api/cron/nurture every hour. Runs on Netlify's native cron — no
// external service needed. Uses CRON_SECRET to authenticate.
export default async (): Promise<Response> => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[nurture-cron] CRON_SECRET not set')
    return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), { status: 500 })
  }

  const origin = process.env.URL ?? 'https://www.screwedscore.com'
  const url = `${origin}/api/cron/nurture`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-Cron-Secret': secret, 'Content-Type': 'application/json' },
    })
    const body = await res.text()
    console.log(`[nurture-cron] ${res.status} ${body}`)
    return new Response(body, { status: res.status })
  } catch (err) {
    console.error('[nurture-cron] fetch failed:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}

export const config: Config = {
  schedule: '@hourly',
}
