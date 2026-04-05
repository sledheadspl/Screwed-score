import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServiceClient()

  if (req.method === 'GET') {
    const { tab, slug } = req.query
    const limit = Math.min(Math.max(parseInt(req.query.limit as string || '20', 10) || 20, 1), 50)

    // Single business lookup
    if (slug && typeof slug === 'string') {
      const { data } = await supabase
        .from('business_scores')
        .select('*')
        .eq('business_slug', slug)
        .maybeSingle()
      return res.status(200).json({ business: data ?? null })
    }

    // Stats
    const { data: allStats } = await supabase
      .from('business_scores')
      .select('total_count, total_flagged_dollars')
    const stats = {
      total_reports: allStats?.reduce((s, b) => s + (b.total_count ?? 0), 0) ?? 0,
      total_flagged: allStats?.reduce((s, b) => s + (b.total_flagged_dollars ?? 0), 0) ?? 0,
      businesses: allStats?.length ?? 0,
    }

    // Wall of Shame or Hall of Honor
    let query = supabase
      .from('business_scores')
      .select('*')
      .gte('total_count', 1)
      .limit(limit)

    if (tab === 'honor') {
      query = query.order('screwed_percent', { ascending: true }).order('total_count', { ascending: false })
    } else {
      query = query.order('screwed_percent', { ascending: false }).order('total_count', { ascending: false })
    }

    const { data } = await query
    return res.status(200).json({ businesses: data ?? [], stats })
  }

  // POST — upsert business score from experience submission
  if (req.method === 'POST') {
    const { business_name, category, city, state, score, amount_dollars } = req.body
    if (!business_name?.trim() || !score) return res.status(400).json({ error: 'Missing fields' })

    const slug = slugify(business_name.trim())
    const { data: existing } = await supabase
      .from('business_scores')
      .select('*')
      .eq('business_slug', slug)
      .maybeSingle()

    const screwed_count = (existing?.screwed_count ?? 0) + (score === 'SCREWED' ? 1 : 0)
    const maybe_count   = (existing?.maybe_count ?? 0)   + (score === 'MAYBE'   ? 1 : 0)
    const safe_count    = (existing?.safe_count ?? 0)    + (score === 'SAFE'    ? 1 : 0)
    const total_count   = screwed_count + maybe_count + safe_count
    const screwed_percent = Math.round((screwed_count / total_count) * 100)
    const total_flagged_dollars = (existing?.total_flagged_dollars ?? 0) + (typeof amount_dollars === 'number' ? amount_dollars : 0)

    await supabase.from('business_scores').upsert({
      business_name: business_name.trim(),
      business_slug: slug,
      category,
      city:  city ?? existing?.city  ?? null,
      state: state ?? existing?.state ?? null,
      screwed_count,
      maybe_count,
      safe_count,
      total_count,
      screwed_percent,
      total_flagged_dollars,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_slug' })

    return res.status(200).json({ ok: true, slug })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
