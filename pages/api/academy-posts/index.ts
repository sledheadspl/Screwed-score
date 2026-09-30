import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'

const VALID_COURSES = new Set([
  'general',
  'academy-estimate-mastery',
  'academy-check-engine',
  'academy-noise-diagnosis',
  'academy-fight-back',
])
const VALID_TYPES = new Set(['question', 'win', 'tip'])

// 15 mutations (POST + PATCH combined) per IP per hour — spam/vote-stuffing guard
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

  if (req.method === 'GET') {
    const { course_id, post_type } = req.query
    const limit  = Math.min(Math.max(parseInt(req.query.limit  as string || '30', 10) || 30, 1), 50)
    const offset = Math.max(parseInt(req.query.offset as string || '0',  10) || 0,  0)

    let query = supabase
      .from('academy_posts_with_reply_count')
      .select('*')
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    if (course_id && course_id !== 'all') query = query.eq('course_id', course_id)
    if (post_type && post_type !== 'all') query = query.eq('post_type', post_type)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: 'Database error' })
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120')
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { ok } = await checkAndIncrementRateLimit(supabase, req, 'academy-community-mutate')
    if (!ok) return res.status(429).json({ error: 'Too many posts. Try again later.' })

    const { course_id, post_type, author_name, body } = req.body

    if (!body?.trim()) {
      return res.status(400).json({ error: 'body is required' })
    }
    if (course_id && !VALID_COURSES.has(course_id)) {
      return res.status(400).json({ error: 'Invalid course_id' })
    }
    if (post_type && !VALID_TYPES.has(post_type)) {
      return res.status(400).json({ error: 'Invalid post_type' })
    }

    const { data, error } = await supabase
      .from('academy_posts')
      .insert({
        course_id: course_id && VALID_COURSES.has(course_id) ? course_id : 'general',
        post_type: post_type && VALID_TYPES.has(post_type) ? post_type : 'question',
        author_name: author_name?.trim().slice(0, 60) || 'Anonymous',
        body: body.trim().slice(0, 2000),
      })
      .select('id')
      .single()

    if (error) return res.status(500).json({ error: 'Database error' })
    return res.status(201).json({ id: data.id })
  }

  if (req.method === 'PATCH') {
    const { ok } = await checkAndIncrementRateLimit(supabase, req, 'academy-community-mutate')
    if (!ok) return res.status(429).json({ error: 'Too many votes. Try again later.' })

    // Upvote
    const { id } = req.query
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

    const { error } = await supabase.rpc('increment_academy_post_upvotes', { post_id: id })
    if (error) {
      console.error('[academy-posts] increment_academy_post_upvotes RPC failed:', error.message)
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
