/**
 * Overcharge detection layer.
 * Runs after ContractGuard analysis to identify suspicious pricing in any document.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ContractGuardOutput, DocumentType, OverchargeOutput } from './types'
import { extractJSON } from './utils'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 45_000,
})

const SYSTEM_PROMPT = `You are a consumer protection analyst specializing in detecting overcharges,
hidden fees, and deceptive pricing in everyday documents.

RULES:
- Never name specific companies as bad actors — use "the service provider" or "they"
- State price context as general approximations only: "typically runs $X–$Y"
- Be direct and plain-spoken — write like you're explaining to a friend
- Focus on concrete dollar amounts and specific line items when visible
- Flag vague line items that could hide padding (e.g., "miscellaneous fees", "processing charge")
- Detect duplicates: same service billed twice under different names
- You are NOT giving legal or medical advice
- Return ONLY valid JSON — no markdown fences, no commentary outside the JSON`

const RESPONSE_SCHEMA = `{
  "document_type": "mechanic_invoice|contractor_estimate|insurance_quote|medical_bill|dental_bill|phone_bill|internet_bill|lease_agreement|brand_deal|employment_contract|service_agreement|unknown",
  "line_items": [
    {
      "description": "string",
      "charged_amount": number or null,
      "flagged": boolean,
      "flag_reason": "string or null",
      "industry_context": "e.g. 'typically $40-$80 for this service' or null",
      "severity": "high|medium|low|null"
    }
  ],
  "total_flagged_amount": number,
  "total_charged_amount": number,
  "industry_range_note": "General context about typical pricing for this document type",
  "top_concerns": ["string", "string", "string"],
  "summary": "2-3 sentence plain summary of what looks suspicious and why"
}`

export async function detectOvercharges(
  text: string,
  documentType: DocumentType,
  cgOutput: ContractGuardOutput
): Promise<OverchargeOutput> {
  const docLabel = documentType.replace(/_/g, ' ')

  // Summarize CG red flags to give context without duplicating the full text
  const cgContext = cgOutput.red_flags
    .slice(0, 5)
    .map(f => `- ${f.title}: ${f.issue}`)
    .join('\n')

  // Truncate document text
  const truncatedText = text.length > 12_000 ? text.slice(0, 12_000) + '\n[text truncated]' : text

  const prompt = `Analyze this ${docLabel} for overcharges and suspicious pricing.

ContractGuard red flags already identified (use as additional context):
${cgContext || '(none)'}

Document text:
${truncatedText}

Return JSON matching this exact schema:
${RESPONSE_SCHEMA}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') {
    throw new Error('Overcharge analysis returned no text content')
  }

  let parsed: OverchargeOutput
  try {
    parsed = extractJSON(block.text) as OverchargeOutput
  } catch {
    throw new Error('Overcharge analysis returned malformed JSON')
  }

  return normalizeOverchargeOutput(parsed)
}

function normalizeOverchargeOutput(raw: OverchargeOutput): OverchargeOutput {
  const lineItems = Array.isArray(raw.line_items) ? raw.line_items : []
  const topConcerns = Array.isArray(raw.top_concerns) ? raw.top_concerns : []

  // Pad to 3 concerns minimum
  while (topConcerns.length < 3) {
    topConcerns.push('Review all line items carefully before paying')
  }

  return {
    document_type: raw.document_type ?? 'unknown',
    line_items: lineItems,
    total_flagged_amount: typeof raw.total_flagged_amount === 'number' ? raw.total_flagged_amount : 0,
    total_charged_amount: typeof raw.total_charged_amount === 'number' ? raw.total_charged_amount : 0,
    industry_range_note: raw.industry_range_note ?? '',
    top_concerns: topConcerns.slice(0, 3),
    summary: raw.summary ?? '',
  }
}
