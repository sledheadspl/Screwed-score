/**
 * Overcharge detection layer.
 * Runs after ContractGuard analysis to identify suspicious pricing in any document.
 */

import Anthropic from '@anthropic-ai/sdk'
import { CORE_ANALYST_DOCTRINE, industryPatternsFor } from './analysis-doctrine'
import type { ContractGuardOutput, DocumentType, OverchargeOutput } from './types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 45_000,
})

// The line-item pass. The doctrine sets the stance and the honesty rules; what
// follows adds only what is specific to auditing pricing.
const SYSTEM_PROMPT = `${CORE_ANALYST_DOCTRINE}

THIS PASS
You are auditing pricing: every charge, fee, and line item. Extract them all before judging any of them, including the small repeated ones.

For each line item, decide whether it is flagged, and if so:
- flag_reason: what is wrong with it, in plain English
- industry_context: the benchmark you are measuring against, stated as a range ("typically runs $40–$80 for this")
- benchmark_confidence: "benchmarked" when industry_context reflects a real industry norm you are confident in; "unbenchmarked" when the charge looks wrong from the document alone and you have no confirmed baseline. If you set "unbenchmarked", write industry_context to match — say that you have no confirmed baseline rather than offering a number. Never invent a range to avoid this admission.
- severity: high, medium, or low, per the confidence rules above

total_flagged_amount must be the sum of the charged amounts you actually flagged — not an estimate, and not the document total. If a charge has no legible amount, leave charged_amount null and keep the flag.

Return ONLY valid JSON — no markdown fences, no commentary outside the JSON.`

const RESPONSE_SCHEMA = `{
  "document_type": "mechanic_invoice|contractor_estimate|insurance_quote|medical_bill|dental_bill|phone_bill|internet_bill|lease_agreement|brand_deal|employment_contract|service_agreement|unknown",
  "line_items": [
    {
      "description": "string",
      "charged_amount": number or null,
      "flagged": boolean,
      "flag_reason": "string or null",
      "industry_context": "e.g. 'typically $40-$80 for this service', or a plain statement that you have no confirmed baseline, or null",
      "benchmark_confidence": "benchmarked|unbenchmarked|null",
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
  cgOutput: ContractGuardOutput | null
): Promise<OverchargeOutput> {
  const docLabel = documentType.replace(/_/g, ' ')

  // Summarize CG red flags to give context without duplicating the full text
  const cgContext = (cgOutput?.red_flags ?? [])
    .slice(0, 5)
    .map(f => `- ${f.title}: ${f.issue}`)
    .join('\n')

  // Truncate document text
  const truncatedText = text.length > 12_000 ? text.slice(0, 12_000) + '\n[text truncated]' : text

  const prompt = `Analyze this ${docLabel} for overcharges and suspicious pricing.

${industryPatternsFor(documentType)}

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

  const jsonMatch = block.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Overcharge analysis did not return valid JSON')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('Overcharge analysis returned malformed JSON')
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Overcharge analysis returned unexpected JSON structure')
  }

  return normalizeOverchargeOutput(parsed as OverchargeOutput)
}

function normalizeOverchargeOutput(raw: OverchargeOutput): OverchargeOutput {
  // An absent or unrecognized confidence is treated as unbenchmarked: the UI
  // must never present a claim as verified because a field was missing.
  const lineItems = (Array.isArray(raw.line_items) ? raw.line_items : []).map(item => ({
    ...item,
    benchmark_confidence:
      item.benchmark_confidence === 'benchmarked' ? 'benchmarked' as const : 'unbenchmarked' as const,
  }))
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
