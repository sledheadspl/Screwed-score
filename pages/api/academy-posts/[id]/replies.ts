import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'

const RATE_LIMIT = 15
const WINDOW_MS = 60 * 60 * 1000

async function checkAndIncrementRateLimit(
  supabase: ReturnType<typeof createServiceClient>,
  req: NextApiRequest,
  scope: string
): Promise<{ ok: boolean }> {
  const ip = (req.headers['x-real-ip'] as string) ??
    (req.headers['cf-connecting-ip'] as string) ??
    (req.headers['x-forwarded-for'] as string)?.split(',').at(-1)?.trim() ??
    '0.0.0.0'
  const ipHash = createHash('sha256').update(`${scope}:${ip}`).digest('hex')

  const { data } = await supabase
    .from('rate_limits')
    .select('request_count, window_start')
    .eq('ip_hash', ipHash)
    .maybeSingle()

  if (data) {
    const windowAge = Date.now() - new Date(data.window_start).getTime()
    if (windowAge < WINDOW_MS && data.request_count >= RATE_LIMIT) return { ok: false }
  }

  const now = new Date().toISOString()
  const windowExpired = !data || Date.now() - new Date(data.window_start).getTime() >= WINDOW_MS
  await supabase.from('rate_limits').upsert(
    {
      ip_hash:       ipHash,
      request_count: windowExpired ? 1 : (data!.request_count + 1),
      window_start:  windowExpired ? now : data!.window_start,
      updated_at:    now,
    },
    { onConflict: 'ip_hash' }
  )
  return { ok: true }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServiceClient()
  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing post id' })

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('academy_post_replies')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) return res.status(500).json({ error: 'Database error' })
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120')
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { ok } = await checkAndIncrementRateLimit(supabase, req, 'academy-community-mutate')
    if (!ok) return res.status(429).json({ error: 'Too many replies. Try again later.' })

    const { author_name, body } = req.body
    if (!body?.trim()) {
      return res.status(400).json({ error: 'body is required' })
    }

    const { data, error } = await supabase
      .from('academy_post_replies')
      .insert({
        post_id: id,
        author_name: author_name?.trim().slice(0, 60) || 'Anonymous',
        body: body.trim().slice(0, 1000),
      })
      .select('id')
      .single()

    if (error) return res.status(500).json({ error: 'Database error' })
    return res.status(201).json({ id: data.id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
