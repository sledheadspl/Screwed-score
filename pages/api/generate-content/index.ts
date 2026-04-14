import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { isValidUUID, extractJSON } from '@/lib/utils'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Max 50 content generations per Pro user (by IP) per day
const LIMIT     = 50
const WINDOW_MS = 24 * 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const proToken = req.cookies['gss_pro']
  if (!proToken || !verifyToken(proToken)) {
    return res.status(403).json({ error: 'PRO_REQUIRED' })
  }

  // Rate limit by IP
  const ip     = (req.headers['x-real-ip'] as string) ??
    (req.headers['cf-connecting-ip'] as string) ??
    (req.headers['x-forwarded-for'] as string)?.split(',').at(-1)?.trim() ??
    '0.0.0.0'
  const ipHash = createHash('sha256').update(`generate-content:${ip}`).digest('hex')

  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('ip_hash', ipHash)
      .maybeSingle()

    if (data) {
      const windowAge = Date.now() - new Date(data.window_start).getTime()
      if (windowAge < WINDOW_MS && data.request_count >= LIMIT) {
        return res.status(429).json({ error: 'Daily generation limit reached. Try again tomorrow.' })
      }
    }

    const now          = new Date().toISOString()
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
  } catch { /* non-fatal */ }

  const { analysis_id } = req.body
  if (!analysis_id || !isValidUUID(analysis_id)) {
    return res.status(400).json({ error: 'Invalid analysis_id' })
  }

  const supabase = createServiceClient()
  const { data: analysis, error } = await supabase
    .from('analyses')
    .select(
      'screwed_score, screwed_score_percent, screwed_score_reason, document_type, plain_summary, what_they_tried, what_to_do_next, top_findings, overcharge_output'
    )
    .eq('id', analysis_id)
    .maybeSingle()

  if (error || !analysis) {
    return res.status(404).json({ error: 'Analysis not found' })
  }

  const flaggedCharges = (analysis.overcharge_output?.line_items ?? [])
    .filter((i: { flagged: boolean }) => i.flagged)
    .slice(0, 3)
    .map(
      (i: { description: string; charged_amount: number | null; flag_reason: string }) =>
        `• ${i.description}: $${i.charged_amount ?? '?'} — ${i.flag_reason}`
    )
    .join('\n')

  const topFindings = (analysis.top_findings ?? [])
    .slice(0, 3)
    .map((f: { title: string; description: string }) => `• ${f.title}: ${f.description}`)
    .join('\n')

  const prompt = `You are a viral social media content creator. Generate a TikTok/Instagram Reel script based on this real document analysis result.

ANALYSIS DATA:
- Document type: ${analysis.document_type?.replace(/_/g, ' ')}
- Verdict: ${analysis.screwed_score} (${analysis.screwed_score_percent}% screwed)
- Summary: ${analysis.plain_summary}
- Key reason: ${analysis.screwed_score_reason}
${flaggedCharges ? `\nFlagged charges:\n${flaggedCharges}` : ''}
${topFindings ? `\nTop findings:\n${topFindings}` : ''}
- What they tried: ${(analysis.what_they_tried ?? []).slice(0, 2).join('; ')}
- What to do: ${(analysis.what_to_do_next ?? []).slice(0, 2).join('; ')}

Generate a viral short-form video package. Be conversational, outraged, relatable. Use "I" as if the creator is telling their own story. Keep it punchy — people swipe fast.

Return ONLY valid JSON in this exact format:
{
  "hook": "The first 1-3 seconds. One punchy sentence that stops the scroll. No hashtags.",
  "script": "The full 30-45 second script with natural pauses marked as [PAUSE]. Include the reveal, the reaction, and the call to action to check their own documents at GetScrewedScore.com.",
  "caption": "The post caption. Conversational, 2-3 sentences max. End with a question to drive comments.",
  "hashtags": ["array", "of", "10", "relevant", "viral", "hashtags", "no", "hash", "symbol"],
  "on_screen_text": ["3-5 short bold text overlays to show during the video"]
}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

    const content = extractJSON(text)

    const flaggedItems = (analysis.overcharge_output?.line_items ?? [])
      .filter((i: { flagged: boolean }) => i.flagged)
      .slice(0, 3)
      .map(
        (i: { description: string; charged_amount: number | null; flag_reason?: string }) => ({
          description:    i.description,
          charged_amount: i.charged_amount ?? null,
          flag_reason:    i.flag_reason ?? null,
        })
      )

    return res.status(200).json({
      ...(content as object),
      _meta: {
        score:          analysis.screwed_score,
        score_percent:  analysis.screwed_score_percent,
        flagged_amount: analysis.overcharge_output?.total_flagged_amount ?? 0,
        flagged_items:  flaggedItems,
        doc_label:      (analysis.document_type ?? 'document').replace(/_/g, ' '),
      },
    })
  } catch (err) {
    console.error('[generate-content]', err)
    return res.status(500).json({ error: 'Failed to generate content' })
  }
}
