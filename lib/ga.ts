import { randomUUID } from 'crypto'

const MEASUREMENT_ID = 'G-23L7FKP8VQ'

/**
 * Send a server-side event to GA4 via the Measurement Protocol.
 * Fire-and-forget safe — never throws. Requires GA_API_SECRET env var.
 */
export async function sendGAEvent(
  eventName: string,
  params: Record<string, string | number | boolean>
): Promise<void> {
  const secret = process.env.GA_API_SECRET
  if (!secret) return
  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${secret}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: randomUUID(),
          events: [{ name: eventName, params }],
        }),
      }
    )
  } catch (err) {
    console.error('[ga]', eventName, err)
  }
}
