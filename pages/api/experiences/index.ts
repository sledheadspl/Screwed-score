import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase'

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
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { business_name, category, score, story, city, state, amount_dollars, analysis_id } = req.body

    if (!business_name?.trim() || !category || !score) {
      return res.status(400).json({ error: 'business_name, category, and score are required' })
    }
    if (!['SCREWED', 'MAYBE', 'SAFE'].includes(score)) {
      return res.status(400).json({ error: 'Invalid score' })
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

    if (error) return res.status(500).json({ error: error.message })

    // Update business reputation score (non-fatal)
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://screwedscore.com'}/api/business-scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_name, category, city, state, score, amount_dollars }),
    }).catch(() => {})

    return res.status(201).json({ id: data.id })
  }

  if (req.method === 'PATCH') {
    // Upvote
    const { id } = req.query
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

    const { error } = await supabase.rpc('increment_upvotes', { experience_id: id })
    if (error) {
      // Fallback if RPC doesn't exist
      const { data: exp } = await supabase.from('experiences').select('upvotes').eq('id', id).single()
      if (!exp) return res.status(404).json({ error: 'Not found' })
      await supabase.from('experiences').update({ upvotes: (exp.upvotes ?? 0) + 1 }).eq('id', id)
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
