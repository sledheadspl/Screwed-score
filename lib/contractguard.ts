/**
 * Wrapper around the ContractGuard analyze-contract Supabase Edge Function.
 * Falls back to a direct Anthropic call if the Edge Function URL is not configured.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ContractGuardOutput } from './types'

// Module-level singleton — avoids re-instantiation on every call in serverless warm invocations
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 45_000,
})

const DIRECT_SYSTEM_PROMPT = `You are an expert contract analyst and consumer protection specialist.
Analyze the provided document and return a detailed JSON analysis.

Return ONLY valid JSON matching this exact structure — no markdown, no commentary:
{
  "contract_type": "string",
  "parties": { "party_a": { "name": "string", "role": "string" }, "party_b": { "name": "string", "role": "string" } },
  "dates": { "effective": "string or null", "expiration": "string or null" },
  "financial_commitment": { "amount": number or null, "currency": "USD", "breakdown": "string" },
  "plain_english_summary": "3-4 sentence plain English summary",
  "key_terms": [{ "term_name": "string", "original_text": "string", "plain_english": "string", "your_obligation": "string" }],
  "red_flags": [{ "title": "string", "clause_text": "string", "severity": "low|medium|high|critical", "issue": "string", "negotiation_script": "string", "alternative_language": "string" }],
  "green_flags": [{ "title": "string", "clause_text": "string", "why_good": "string" }],
  "missing_protections": [{ "protection_name": "string", "why_important": "string", "risk_without_it": "string", "suggested_language": "string" }],
  "overall_grade": "A|B|C|D|F",
  "questions_to_ask": ["string"],
  "pro_tips": ["string"]
}

Grading: A=very fair/balanced, B=minor concerns, C=some concerning clauses, D=multiple red flags, F=heavily one-sided/predatory`

export async function runContractGuardAnalysis(
  text: string,
  documentType: string
): Promise<ContractGuardOutput> {
  const functionUrl = process.env.CONTRACTGUARD_FUNCTION_URL
  const functionKey = process.env.CONTRACTGUARD_FUNCTION_KEY

  if (functionUrl && functionKey) {
    return callEdgeFunction(text, documentType, functionUrl, functionKey)
  }

  return runDirectAnalysis(text, documentType)
}

async function callEdgeFunction(
  text: string,
  documentType: string,
  url: string,
  key: string
): Promise<ContractGuardOutput> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45_000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        contractText: text,
        contractType: documentType,
        action: 'analyze',
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => `HTTP ${response.status}`)
      throw new Error(`ContractGuard edge function error (${response.status}): ${errText}`)
    }

    const data = await response.json()
    const result: ContractGuardOutput = data.analysis ?? data

    // Normalize to ensure required arrays are present even if AI omitted them
    return normalizeContractGuardOutput(result)
  } finally {
    clearTimeout(timeoutId)
  }
}

async function runDirectAnalysis(
  text: string,
  documentType: string
): Promise<ContractGuardOutput> {
  // Truncate to model context limit; 15k chars ≈ ~4k tokens
  const truncatedText = text.length > 15_000 ? text.slice(0, 15_000) + '\n[text truncated]' : text

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: DIRECT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Document type: ${documentType}\n\nDocument text:\n${truncatedText}`,
      },
    ],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') {
    throw new Error('ContractGuard analysis returned no text content')
  }

  const jsonMatch = block.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('ContractGuard analysis did not return valid JSON')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('ContractGuard analysis returned malformed JSON')
  }

  return normalizeContractGuardOutput(parsed as ContractGuardOutput)
}

/** Ensures all required array fields exist and have safe defaults. */
function normalizeContractGuardOutput(raw: ContractGuardOutput): ContractGuardOutput {
  return {
    ...raw,
    contract_type: raw.contract_type ?? 'unknown',
    plain_english_summary: raw.plain_english_summary ?? '',
    key_terms: raw.key_terms ?? [],
    red_flags: raw.red_flags ?? [],
    green_flags: raw.green_flags ?? [],
    missing_protections: raw.missing_protections ?? [],
    overall_grade: raw.overall_grade ?? 'C',
    questions_to_ask: raw.questions_to_ask ?? [],
    pro_tips: raw.pro_tips ?? [],
  }
}
