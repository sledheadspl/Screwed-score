/**
 * Wrapper around the ContractGuard analyze-contract Supabase Edge Function.
 * Falls back to a direct Anthropic call if the Edge Function URL is not configured.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ContractGuardOutput } from './types'
import { extractJSON } from './utils'

// Module-level singleton — avoids re-instantiation on every call in serverless warm invocations
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 25_000,
})

const DIRECT_SYSTEM_PROMPT = `You are an expert contract analyst and consumer protection specialist.
Analyze the provided document and return a detailed JSON analysis.

LANGUAGE RULES:
1. Detect the language of the document text.
2. Write ALL text fields in your response in that same language.
3. Set "detected_language" to the ISO 639-1 code (e.g. "en", "es", "fr", "de", "pt", "zh", "ar", "ja", "ko", "hi").
4. If the document is in English, respond in English as normal.

Return ONLY valid JSON matching this exact structure — no markdown, no commentary:
{
  "contract_type": "string",
  "detected_language": "ISO 639-1 code e.g. en",
  "parties": { "party_a": { "name": "string", "role": "string" }, "party_b": { "name": "string", "role": "string" } },
  "dates": { "effective": "string or null", "expiration": "string or null" },
  "financial_commitment": { "amount": number or null, "currency": "string", "breakdown": "string" },
  "plain_english_summary": "3-4 sentence summary in the document's language",
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

  let parsed: unknown
  try {
    parsed = extractJSON(block.text)
  } catch {
    throw new Error('ContractGuard analysis returned malformed JSON')
  }

  return normalizeContractGuardOutput(parsed as ContractGuardOutput)
}

/** Ensures all required array fields exist and have safe defaults. */
function normalizeContractGuardOutput(raw: ContractGuardOutput): ContractGuardOutput {
  return {
    ...raw,
    contract_type:         raw.contract_type ?? 'unknown',
    detected_language:     raw.detected_language ?? 'en',
    plain_english_summary: raw.plain_english_summary ?? '',
    key_terms:             raw.key_terms ?? [],
    red_flags:             raw.red_flags ?? [],
    green_flags:           raw.green_flags ?? [],
    missing_protections:   raw.missing_protections ?? [],
    overall_grade:         raw.overall_grade ?? 'C',
    questions_to_ask:      raw.questions_to_ask ?? [],
    pro_tips:              raw.pro_tips ?? [],
  }
}
