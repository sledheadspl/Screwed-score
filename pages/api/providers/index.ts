import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { VENDOR_CATEGORIES } from '@/lib/types/vendors'

const POST_RATE_LIMIT = 10 // submissions per IP per hour
const POST_WINDOW_MS = 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServiceClient()

  if (req.method === 'GET') {
    const { category, state, limit = '10' } = req.query
    let query = supabase
      .from('providers')
      .select('*')
      .order('trust_score', { ascending: false })
      .limit(Number(limit))

    if (category && category !== 'all') query = query.eq('category', category)
    if (state) query = query.eq('state', state)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: 'Database error' })
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    // Per-IP rate limit on provider submissions (spam guard)
    const ip = (req.headers['x-real-ip'] as string) ??
      (req.headers['cf-connecting-ip'] as string) ??
      (req.headers['x-forwarded-for'] as string)?.split(',').at(-1)?.trim() ??
      '0.0.0.0'
    const ipHash = createHash('sha256').update(`providers:${ip}`).digest('hex')
    const { data: rl } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('ip_hash', ipHash)
      .maybeSingle()
    if (rl) {
      const age = Date.now() - new Date(rl.window_start).getTime()
      if (age < POST_WINDOW_MS && rl.request_count >= POST_RATE_LIMIT) {
        return res.status(429).json({ error: 'Too many submissions. Try again later.' })
      }
    }
    const now = new Date().toISOString()
    const expired = !rl || Date.now() - new Date(rl.window_start).getTime() >= POST_WINDOW_MS
    await supabase.from('rate_limits').upsert(
      {
        ip_hash:       ipHash,
        request_count: expired ? 1 : (rl!.request_count + 1),
        window_start:  expired ? now : rl!.window_start,
        updated_at:    now,
      },
      { onConflict: 'ip_hash' }
    )

    const { name, category, city, state, website, phone, description, submitted_by } = req.body

    if (!name?.trim() || !category) {
      return res.status(400).json({ error: 'name and category are required' })
    }
    if (!VENDOR_CATEGORIES.has(category)) {
      return res.status(400).json({ error: 'Invalid category' })
    }
    // Validate website URL — must be https if provided
    if (website && typeof website === 'string' && website.trim()) {
      if (!website.trim().startsWith('https://')) {
        return res.status(400).json({ error: 'website must be a valid https URL' })
      }
    }

    const { data, error } = await supabase
      .from('providers')
      .insert({
        name: name.trim().slice(0, 100),
        category,
        city: city?.trim().slice(0, 50) ?? null,
        state: state?.trim().slice(0, 2).toUpperCase() ?? null,
        website: website?.trim().slice(0, 200) ?? null,
        phone: phone?.trim().slice(0, 20) ?? null,
        description: description?.trim().slice(0, 300) ?? null,
        submitted_by: submitted_by?.trim().slice(0, 100) ?? null,
      })
      .select('id')
      .single()

    if (error) return res.status(500).json({ error: 'Database error' })
    return res.status(201).json({ id: data.id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
