/**
 * Wrapper around the ContractGuard analyze-contract Supabase Edge Function.
 * Falls back to a direct Anthropic call if the Edge Function URL is not configured.
 */

import Anthropic from '@anthropic-ai/sdk'
import { CORE_ANALYST_DOCTRINE, industryPatternsFor } from './analysis-doctrine'
import type { ContractGuardOutput, DocumentType } from './types'

// Module-level singleton — avoids re-instantiation on every call in serverless warm invocations
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 45_000,
})

// The clause pass. The doctrine sets the stance and the honesty rules; what
// follows adds only what is specific to reading terms and obligations.
const DIRECT_SYSTEM_PROMPT = `${CORE_ANALYST_DOCTRINE}

THIS PASS
You are reading the terms: what the document obligates this person to do, what it lets the other side do, and what protections are missing. Quote the actual clause text you are reacting to in clause_text — a red flag with no quoted source is not usable.

negotiation_script must be something the reader can say out loud, in their own voice. alternative_language must be clause text they could actually propose. "Consult an attorney" is not a negotiation script; if the right move genuinely is to get a lawyer, say specifically what to bring and what to ask.

Apply the same honesty rule to statutes as to prices: if a clause may be unenforceable in some jurisdictions, say that it may be, and say it depends on where they are. Do not cite a statute you are not sure of.

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
        content: `Document type: ${documentType}\n\n${industryPatternsFor(documentType as DocumentType)}\n\nDocument text:\n${truncatedText}`,
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

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('ContractGuard analysis returned unexpected JSON structure')
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
