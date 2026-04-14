import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { DOCUMENT_TYPE_LABELS } from '@/lib/types'
import type { DocumentType } from '@/lib/types'

const anthropic = new Anthropic()

// Max 5 dispute letters per IP per hour
const LIMIT     = 5
const WINDOW_MS = 60 * 60 * 1000

const RECIPIENT_BY_TYPE: Record<string, string> = {
  mechanic_invoice:    'Service Manager / Billing Department',
  medical_bill:        'Patient Billing Department',
  dental_bill:         'Patient Billing Department',
  contractor_estimate: 'Project Manager / Owner',
  phone_bill:          'Customer Billing Department',
  internet_bill:       'Customer Billing Department',
  lease_agreement:     'Property Manager / Landlord',
  insurance_quote:     'Policy Services Department',
  employment_contract: 'Human Resources Department',
  brand_deal:          'Business Affairs / Contracts Department',
  service_agreement:   'Billing / Contracts Department',
  unknown:             'Billing Department',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Rate limit by IP
  const ip     = (req.headers['x-real-ip'] as string) ??
    (req.headers['cf-connecting-ip'] as string) ??
    (req.headers['x-forwarded-for'] as string)?.split(',').at(-1)?.trim() ??
    '0.0.0.0'
  const ipHash = createHash('sha256').update(`dispute-letter:${ip}`).digest('hex')

  const supabase = createServiceClient()

  try {
    const { data } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('ip_hash', ipHash)
      .maybeSingle()

    if (data) {
      const windowAge = Date.now() - new Date(data.window_start).getTime()
      if (windowAge < WINDOW_MS && data.request_count >= LIMIT) {
        return res.status(429).json({ error: 'Too many requests. Try again later.' })
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

  const { analysis_id } = req.body as { analysis_id?: string }
  if (!analysis_id || typeof analysis_id !== 'string') {
    return res.status(400).json({ error: 'analysis_id required' })
  }

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysis_id)
    .eq('is_public', true)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Analysis not found' })

  const docType = data.document_type as DocumentType
  const docLabel = DOCUMENT_TYPE_LABELS[docType] ?? 'Document'
  const recipient = RECIPIENT_BY_TYPE[docType] ?? 'Billing Department'

  const overcharge = data.overcharge_output ?? {}
  const contractGuard = data.contract_guard_output ?? {}

  const flaggedItems: Array<{ description: string; charged_amount?: number | null; flag_reason?: string | null }> =
    (overcharge.line_items ?? []).filter((i: { flagged: boolean }) => i.flagged)
  const totalFlagged: number = overcharge.total_flagged_amount ?? 0
  const redFlags: Array<{ title: string; severity: string; issue: string }> =
    contractGuard.red_flags ?? []

  const flaggedText = flaggedItems.length > 0
    ? flaggedItems.map(i =>
        `- ${i.description}${i.charged_amount != null ? `: $${i.charged_amount.toFixed(2)}` : ''}${i.flag_reason ? ` — ${i.flag_reason}` : ''}`
      ).join('\n')
    : null

  const redFlagText = redFlags.length > 0
    ? redFlags.map(f => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.issue}`).join('\n')
    : null

  const issueContext = [
    flaggedText   ? `BILLING ISSUES:\n${flaggedText}` : null,
    redFlagText   ? `CONTRACT/CLAUSE ISSUES:\n${redFlagText}` : null,
    `OVERALL: ${data.screwed_score_reason ?? ''}`,
  ].filter(Boolean).join('\n\n')

  const prompt = `You are a consumer rights advocate writing a professional dispute letter for someone who received a ${docLabel} with AI-identified issues.

${issueContext}
${totalFlagged > 0 ? `\nTotal amount flagged: $${totalFlagged.toFixed(2)}` : ''}

Write a formal dispute letter addressed to: ${recipient}

Rules:
- Use [YOUR NAME], [YOUR ADDRESS], [YOUR PHONE/EMAIL], and [DATE] as placeholders
- Reference each specific issue (exact items, dollar amounts, clause names) — be precise
- State a clear demand: itemized correction, refund of overcharged amount, clause removal, or written explanation
- Set a 14-day deadline for written response
- Cite applicable consumer protection law where relevant (e.g. Fair Debt Collection Practices Act for medical/dental billing, your state's consumer protection statute for service overcharges, state landlord-tenant law for lease disputes)
- Tone: professional and firm — not aggressive, not apologetic
- Close with a concrete next-steps warning if unresolved (state attorney general complaint, BBB filing, small claims court)
- Use proper formal letter formatting with spacing

Return ONLY the letter text. Start with [YOUR NAME].`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = message.content[0]
    if (!block || block.type !== 'text') {
      return res.status(500).json({ error: 'Failed to generate letter' })
    }
    return res.status(200).json({ letter: block.text })
  } catch (err) {
    console.error('[dispute-letter]', err)
    return res.status(500).json({ error: 'Failed to generate letter' })
  }
}
