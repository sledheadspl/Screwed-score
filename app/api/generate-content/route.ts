import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { verifyToken } from '@/app/api/verify-checkout/route'
import { isValidUUID } from '@/lib/utils'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Pro gate — verify token AND confirm it hasn't been revoked
  const proToken = req.cookies.get('gss_pro')?.value
  if (!proToken) {
    return NextResponse.json({ error: 'PRO_REQUIRED' }, { status: 403 })
  }
  const subscriptionId = verifyToken(proToken)
  if (!subscriptionId) {
    return NextResponse.json({ error: 'PRO_REQUIRED' }, { status: 403 })
  }

  const supabase = createServiceClient()

  const { data: revoked } = await supabase
    .from('revoked_subscriptions')
    .select('subscription_id')
    .eq('subscription_id', subscriptionId)
    .maybeSingle()
  if (revoked) {
    return NextResponse.json({ error: 'PRO_REQUIRED' }, { status: 403 })
  }

  const { analysis_id } = await req.json()
  if (!analysis_id || !isValidUUID(analysis_id)) {
    return NextResponse.json({ error: 'Invalid analysis_id' }, { status: 400 })
  }
  const { data: analysis, error } = await supabase
    .from('analyses')
    .select('screwed_score, screwed_score_percent, screwed_score_reason, document_type, plain_summary, what_they_tried, what_to_do_next, top_findings, overcharge_output')
    .eq('id', analysis_id)
    .maybeSingle()

  if (error || !analysis) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
  }

  const flaggedCharges = (analysis.overcharge_output?.line_items ?? [])
    .filter((i: { flagged: boolean }) => i.flagged)
    .slice(0, 3)
    .map((i: { description: string; charged_amount: number | null; flag_reason: string }) =>
      `• ${i.description}: $${i.charged_amount ?? '?'} — ${i.flag_reason}`
    ).join('\n')

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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const content = JSON.parse(jsonMatch[0])
    return NextResponse.json(content)
  } catch {
    return NextResponse.json({ error: 'Failed to parse generated content' }, { status: 500 })
  }
}
