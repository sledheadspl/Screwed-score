import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'

type HeaderSource = { get(name: string): string | null } | Record<string, string | string[] | undefined>

function header(h: HeaderSource, name: string): string | null {
  if (typeof (h as { get?: unknown }).get === 'function') {
    return (h as { get(n: string): string | null }).get(name)
  }
  const v = (h as Record<string, string | string[] | undefined>)[name]
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

/**
 * Client IP. Netlify sets x-nf-client-connection-ip itself, so it can't be
 * forged by the caller; the others are fallbacks for local dev.
 */
export function clientIp(h: HeaderSource): string {
  return (
    header(h, 'x-nf-client-connection-ip') ??
    header(h, 'x-real-ip') ??
    header(h, 'x-forwarded-for')?.split(',').at(-1)?.trim() ??
    '0.0.0.0'
  )
}

/**
 * Fixed-window limit stored in the rate_limits table, keyed by a hash of
 * `${bucket}:${key}`. Returns true when the request is allowed.
 * Fails open on database errors so an outage doesn't take the route down.
 */
export async function allowRequest(bucket: string, key: string, limit: number, windowMs: number): Promise<boolean> {
  const ipHash = createHash('sha256').update(`${bucket}:${key}`).digest('hex')
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('ip_hash', ipHash)
      .maybeSingle()

    const now = Date.now()
    const expired = !data || now - new Date(data.window_start).getTime() >= windowMs
    if (!expired && data!.request_count >= limit) return false

    const nowIso = new Date(now).toISOString()
    await supabase.from('rate_limits').upsert(
      {
        ip_hash:       ipHash,
        request_count: expired ? 1 : data!.request_count + 1,
        window_start:  expired ? nowIso : data!.window_start,
        updated_at:    nowIso,
      },
      { onConflict: 'ip_hash' }
    )
    return true
  } catch {
    return true
  }
}
