import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase'

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
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { name, category, city, state, website, phone, description, submitted_by } = req.body

    if (!name?.trim() || !category) {
      return res.status(400).json({ error: 'name and category are required' })
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

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ id: data.id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
