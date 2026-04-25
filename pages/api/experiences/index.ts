import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { VENDOR_CATEGORIES } from '@/lib/types/vendors'

const VALID_SCORES = new Set(['SCREWED', 'MAYBE', 'SAFE'])

// 10 mutations (POST + PATCH combined) per IP per hour — spam/vote-stuffing guard
const RATE_LIMIT = 10
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

  if (req.method === 'GET') {
    const { category, score } = req.query
    const limit  = Math.min(Math.max(parseInt(req.query.limit  as string || '20', 10) || 20, 1), 50)
    const offset = Math.max(parseInt(req.query.offset as string || '0',  10) || 0,  0)
    let query = supabase
      .from('experiences')
      .select('*')
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (category && category !== 'all') query = query.eq('category', category)
    if (score && score !== 'all') query = query.eq('score', score)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: 'Database error' })
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { ok } = await checkAndIncrementRateLimit(supabase, req, 'experiences-mutate')
    if (!ok) return res.status(429).json({ error: 'Too many submissions. Try again later.' })

    const { business_name, category, score, story, city, state, amount_dollars, analysis_id } = req.body

    if (!business_name?.trim() || !category || !score) {
      return res.status(400).json({ error: 'business_name, category, and score are required' })
    }
    if (!VALID_SCORES.has(score)) {
      return res.status(400).json({ error: 'Invalid score' })
    }
    if (!VENDOR_CATEGORIES.has(category)) {
      return res.status(400).json({ error: 'Invalid category' })
    }

    const { data, error } = await supabase
      .from('experiences')
      .insert({
        business_name: business_name.trim().slice(0, 100),
        category,
        score,
        story: story?.trim().slice(0, 500) ?? null,
        city: city?.trim().slice(0, 50) ?? null,
        state: state?.trim().slice(0, 2).toUpperCase() ?? null,
        amount_dollars: typeof amount_dollars === 'number' ? amount_dollars : null,
        analysis_id: analysis_id ?? null,
      })
      .select('id')
      .single()

    if (error) return res.status(500).json({ error: 'Database error' })

    // Update business reputation score asynchronously (non-fatal)
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://screwedscore.com'}/api/business-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.GSS_TOKEN_SECRET ?? '',
      },
      body: JSON.stringify({ business_name, category, city, state, score, amount_dollars }),
    }).catch((err: unknown) => {
      console.error('[experiences] Failed to update business-scores:', err instanceof Error ? err.message : String(err))
    })

    return res.status(201).json({ id: data.id })
  }

  if (req.method === 'PATCH') {
    const { ok } = await checkAndIncrementRateLimit(supabase, req, 'experiences-mutate')
    if (!ok) return res.status(429).json({ error: 'Too many votes. Try again later.' })

    // Upvote
    const { id } = req.query
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

    const { error } = await supabase.rpc('increment_upvotes', { experience_id: id })
    if (error) {
      console.error('[experiences] increment_upvotes RPC failed:', error.message)
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
