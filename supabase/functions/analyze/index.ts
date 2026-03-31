// Supabase Edge Function — full analysis pipeline
// Runs ContractGuard + Overcharge detection in parallel, assembles score, saves to DB.
// Called directly from the browser — bypasses Netlify entirely.

import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://screwedscore.com',
  'https://www.screwedscore.com',
  'https://getscrewedscore.netlify.app',
]

function getCORS(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  }
}

function json(data: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...(req ? getCORS(req) : { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0] }), 'Content-Type': 'application/json' },
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip lone UTF-16 surrogates — they come from badly-encoded PDFs and break JSON.parse */
function sanitizeText(text: string): string {
  return text.replace(/[\uD800-\uDFFF]/g, '')
}

function isValidUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function extractJSON(text: string): unknown {
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '')
  const start = stripped.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')
  let depth = 0, inString = false, escape = false
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    if (ch === '}') { depth--; if (depth === 0) return JSON.parse(stripped.slice(start, i + 1)) }
  }
  throw new Error('Malformed JSON: unmatched braces')
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DocumentType = 'mechanic_invoice'|'contractor_estimate'|'insurance_quote'|'medical_bill'|'dental_bill'|'phone_bill'|'internet_bill'|'lease_agreement'|'brand_deal'|'employment_contract'|'service_agreement'|'unknown'
type ScrewedScore = 'SCREWED'|'MAYBE'|'SAFE'
type FindingSeverity = 'high'|'medium'|'low'

interface RedFlag { title: string; clause_text: string; severity: string; issue: string; negotiation_script?: string; alternative_language?: string }
interface GreenFlag { title: string; clause_text: string; why_good: string }
interface MissingProtection { protection_name: string; why_important: string; risk_without_it: string; suggested_language?: string }
interface ContractGuardOutput {
  contract_type: string; detected_language?: string
  parties?: unknown; dates?: unknown; financial_commitment?: unknown
  plain_english_summary: string
  key_terms: unknown[]
  red_flags: RedFlag[]; green_flags: GreenFlag[]; missing_protections: MissingProtection[]
  overall_grade: string; questions_to_ask: string[]; pro_tips: string[]
}
interface LineItem { description: string; charged_amount: number|null; flagged: boolean; flag_reason?: string|null; industry_context?: string|null; severity: string|null }
interface OverchargeOutput {
  document_type: DocumentType; line_items: LineItem[]
  total_flagged_amount: number; total_charged_amount: number
  industry_range_note: string; top_concerns: string[]; summary: string
}
interface Finding { severity: FindingSeverity; category: string; title: string; description: string; original_text?: string; suggested_fix?: string; dollar_impact?: number }

// ─── ContractGuard Analysis ───────────────────────────────────────────────────

const CG_SYSTEM = `You are an expert contract analyst and consumer protection specialist.
Analyze the provided document and return a detailed JSON analysis.

LANGUAGE RULES:
1. Detect the language of the document text.
2. Write ALL text fields in your response in that same language.
3. Set "detected_language" to the ISO 639-1 code (e.g. "en", "es", "fr", "de", "pt", "zh", "ar", "ja", "ko", "hi").

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

async function runContractGuard(text: string, documentType: string, client: Anthropic): Promise<ContractGuardOutput> {
  const truncated = text.length > 15_000 ? text.slice(0, 15_000) + '\n[text truncated]' : text
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: CG_SYSTEM,
    messages: [{ role: 'user', content: `Document type: ${documentType}\n\nDocument text:\n${truncated}` }],
  })
  const block = response.content[0]
  if (!block || block.type !== 'text') throw new Error('ContractGuard returned no content')
  const parsed = extractJSON(block.text) as ContractGuardOutput
  return {
    ...parsed,
    contract_type: parsed.contract_type ?? 'unknown',
    detected_language: parsed.detected_language ?? 'en',
    plain_english_summary: parsed.plain_english_summary ?? '',
    key_terms: parsed.key_terms ?? [],
    red_flags: parsed.red_flags ?? [],
    green_flags: parsed.green_flags ?? [],
    missing_protections: parsed.missing_protections ?? [],
    overall_grade: parsed.overall_grade ?? 'C',
    questions_to_ask: parsed.questions_to_ask ?? [],
    pro_tips: parsed.pro_tips ?? [],
  }
}

// ─── Overcharge Detection ─────────────────────────────────────────────────────

const OC_SYSTEM = `You are a consumer protection analyst specializing in detecting overcharges, hidden fees, and deceptive pricing.
RULES:
- Never name specific companies as bad actors — use "the service provider" or "they"
- State price context as general approximations only: "typically runs $X–$Y"
- Be direct and plain-spoken
- Return ONLY valid JSON — no markdown fences, no commentary outside the JSON
- Write ALL text fields in the language specified in the user prompt`

const OC_SCHEMA = `{
  "document_type": "mechanic_invoice|contractor_estimate|insurance_quote|medical_bill|dental_bill|phone_bill|internet_bill|lease_agreement|brand_deal|employment_contract|service_agreement|unknown",
  "line_items": [{ "description": "string", "charged_amount": number or null, "flagged": boolean, "flag_reason": "string or null", "industry_context": "string or null", "severity": "high|medium|low|null" }],
  "total_flagged_amount": number,
  "total_charged_amount": number,
  "industry_range_note": "string",
  "top_concerns": ["string", "string", "string"],
  "summary": "2-3 sentence plain summary"
}`

async function runOvercharge(text: string, documentType: string, language: string, client: Anthropic): Promise<OverchargeOutput> {
  const truncated = text.length > 12_000 ? text.slice(0, 12_000) + '\n[text truncated]' : text
  const langNote = language !== 'en' ? `\nIMPORTANT: Write all text fields in this language: ${language}\n` : ''
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2500,
    system: OC_SYSTEM,
    messages: [{ role: 'user', content: `Analyze this ${documentType.replace(/_/g, ' ')} for overcharges.${langNote}\nDocument text:\n${truncated}\n\nReturn JSON matching:\n${OC_SCHEMA}` }],
  })
  const block = response.content[0]
  if (!block || block.type !== 'text') throw new Error('Overcharge analysis returned no content')
  const parsed = extractJSON(block.text) as OverchargeOutput
  const lineItems = Array.isArray(parsed.line_items) ? parsed.line_items : []
  const topConcerns = Array.isArray(parsed.top_concerns) ? parsed.top_concerns : []
  while (topConcerns.length < 3) topConcerns.push('Review all line items carefully before paying')
  return {
    document_type: parsed.document_type ?? 'unknown',
    line_items: lineItems,
    total_flagged_amount: typeof parsed.total_flagged_amount === 'number' ? parsed.total_flagged_amount : 0,
    total_charged_amount: typeof parsed.total_charged_amount === 'number' ? parsed.total_charged_amount : 0,
    industry_range_note: parsed.industry_range_note ?? '',
    top_concerns: topConcerns.slice(0, 3),
    summary: parsed.summary ?? '',
  }
}

// ─── Score Assembly ───────────────────────────────────────────────────────────

function assembleResult(id: string, documentType: DocumentType, cg: ContractGuardOutput, oc: OverchargeOutput) {
  const redFlags = cg.red_flags ?? []
  const missingProtections = cg.missing_protections ?? []
  const lineItems = oc.line_items ?? []

  let points = 0
  points += redFlags.filter(f => f.severity === 'critical').length * 25
  points += redFlags.filter(f => f.severity === 'high').length * 15
  points += redFlags.filter(f => f.severity === 'medium').length * 8
  points += missingProtections.length * 5
  const gradePoints: Record<string, number> = { A: 0, B: 5, C: 15, D: 25, F: 40 }
  points += gradePoints[cg.overall_grade] ?? 0
  const flaggedItems = lineItems.filter(i => i.flagged)
  points += flaggedItems.filter(i => i.severity === 'high').length * 20
  points += flaggedItems.filter(i => i.severity === 'medium').length * 10
  const flaggedAmount = oc.total_flagged_amount ?? 0
  if (flaggedAmount > 1000) points += 20
  else if (flaggedAmount > 500) points += 15
  else if (flaggedAmount > 100) points += 8
  const percent = Math.min(100, points)

  let score: ScrewedScore
  let reason: string
  if (percent >= 50) {
    score = 'SCREWED'
    const parts: string[] = []
    const cf = redFlags.filter(f => f.severity === 'critical').length
    const hf = redFlags.filter(f => f.severity === 'high').length
    if (cf > 0) parts.push(`${cf} critical clause${cf > 1 ? 's' : ''} that heavily favor the other party`)
    if (hf > 0) parts.push(`${hf} high-severity red flag${hf > 1 ? 's' : ''}`)
    if (flaggedAmount > 0) parts.push(`$${flaggedAmount.toFixed(0)} in suspicious charges`)
    if (cg.overall_grade === 'D' || cg.overall_grade === 'F') parts.push(`an overall grade of ${cg.overall_grade}`)
    reason = parts.length > 0 ? `This document has ${parts.join(', ')}.` : 'Multiple serious issues detected.'
  } else if (percent >= 20) {
    score = 'MAYBE'
    const hf = redFlags.filter(f => f.severity === 'high').length
    const mf = redFlags.filter(f => f.severity === 'medium').length
    const parts: string[] = []
    if (hf > 0) parts.push(`${hf} high-severity flag${hf > 1 ? 's' : ''}`)
    if (mf > 0) parts.push(`${mf} medium-severity concern${mf > 1 ? 's' : ''}`)
    if (flaggedAmount > 0) parts.push(`$${flaggedAmount.toFixed(0)} in potentially inflated charges`)
    reason = parts.length > 0 ? `Some concerns worth reviewing: ${parts.join(', ')}.` : 'A few things deserve a closer look.'
  } else {
    score = 'SAFE'
    const gc = (cg.green_flags ?? []).length
    reason = gc > 0 ? `This document looks reasonable. ${gc} protective clause${gc > 1 ? 's' : ''} found in your favor.` : 'No major red flags detected. Still review before signing.'
  }

  // Build findings
  const findings: Finding[] = []
  for (const flag of redFlags) {
    const sev: FindingSeverity = (flag.severity === 'critical' || flag.severity === 'high') ? 'high' : flag.severity === 'medium' ? 'medium' : 'low'
    findings.push({ severity: sev, category: 'risky_clause', title: flag.title, description: flag.issue, original_text: flag.clause_text, suggested_fix: flag.alternative_language })
  }
  for (const item of flaggedItems) {
    findings.push({ severity: ((item.severity ?? 'medium') as FindingSeverity), category: 'overcharge', title: `Suspicious charge: ${item.description}`, description: item.flag_reason ?? 'This charge appears higher than expected', original_text: item.charged_amount != null ? `Charged: $${item.charged_amount}` : undefined, suggested_fix: item.industry_context ?? undefined, dollar_impact: item.charged_amount ?? undefined })
  }
  for (const p of missingProtections.slice(0, 3)) {
    findings.push({ severity: 'medium', category: 'missing_protection', title: `Missing: ${p.protection_name}`, description: p.why_important, suggested_fix: p.suggested_language })
  }
  const order: Record<FindingSeverity, number> = { high: 0, medium: 1, low: 2 }
  findings.sort((a, b) => order[a.severity] - order[b.severity])

  // What they tried
  const tried = new Set<string>()
  const topFlag = redFlags.find(f => f.severity === 'critical' || f.severity === 'high')
  if (topFlag) tried.add(topFlag.issue)
  const topCharge = flaggedItems.find(i => i.severity === 'high')
  if (topCharge?.flag_reason) tried.add(topCharge.flag_reason)
  const topMissing = missingProtections[0]
  if (topMissing) tried.add(`Left out ${topMissing.protection_name}: ${topMissing.why_important}`)
  for (const flag of redFlags) { if (tried.size >= 3) break; tried.add(flag.issue) }

  // What to do next
  const steps: string[] = []
  if (flaggedAmount > 0) steps.push(`Ask for an itemized breakdown of the $${flaggedAmount.toFixed(0)} in flagged charges before paying`)
  const firstQ = (cg.questions_to_ask ?? [])[0]
  if (firstQ) steps.push(firstQ)
  if (redFlags.some(f => f.severity === 'critical')) steps.push('Do not sign or pay until the critical clauses are addressed in writing')
  else if (redFlags.some(f => f.severity === 'high')) steps.push('Request revisions to the high-severity clauses before agreeing')
  const firstTip = (cg.pro_tips ?? [])[0]
  if (firstTip) steps.push(firstTip)

  return {
    id, document_type: documentType,
    language: cg.detected_language ?? 'en',
    screwed_score: score, screwed_score_reason: reason, screwed_score_percent: percent,
    top_findings: findings,
    overcharge: oc, contract_guard: cg,
    plain_summary: cg.plain_english_summary ?? '',
    what_they_tried: [...tried].slice(0, 3),
    what_to_do_next: steps.slice(0, 4),
    is_public: true,
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCORS(req) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, req)

  try {
    const body = await req.json().catch(() => null)
    if (!body?.document_id || typeof body.document_id !== 'string') {
      return json({ error: 'document_id is required' }, 400, req)
    }
    if (!isValidUUID(body.document_id)) {
      return json({ error: 'Invalid document_id format' }, 400, req)
    }

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // Fetch document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, extracted_text, document_type')
      .eq('id', body.document_id)
      .maybeSingle()

    if (docError) return json({ error: 'Failed to retrieve document' }, 500, req)
    if (!doc) return json({ error: 'Document not found' }, 404, req)
    if (!doc.extracted_text || doc.extracted_text.trim().length < 20) {
      return json({ error: 'Document has no readable text' }, 422, req)
    }

    const documentType = doc.document_type as DocumentType
    // Sanitize before sending to AI — removes lone surrogates from bad PDFs
    const cleanText = sanitizeText(doc.extracted_text)

    // Run both AI calls in parallel
    const [cgOutput, ocOutput] = await Promise.all([
      runContractGuard(cleanText, documentType, anthropic),
      runOvercharge(cleanText, documentType, 'en', anthropic),
    ])
    const detectedLanguage = cgOutput.detected_language ?? 'en'

    // Re-run overcharge with correct language if not English
    const overchargeOutput = detectedLanguage !== 'en'
      ? await runOvercharge(cleanText, documentType, detectedLanguage, anthropic)
      : ocOutput

    const analysisId = crypto.randomUUID()
    const result = assembleResult(analysisId, documentType, cgOutput, overchargeOutput)

    // Save to DB (non-fatal)
    const { error: saveError } = await supabase.from('analyses').insert({
      id:                    analysisId,
      document_id:           body.document_id,
      screwed_score:         result.screwed_score,
      screwed_score_percent: result.screwed_score_percent,
      screwed_score_reason:  result.screwed_score_reason,
      document_type:         result.document_type,
      plain_summary:         result.plain_summary,
      what_they_tried:       result.what_they_tried,
      what_to_do_next:       result.what_to_do_next,
      top_findings:          result.top_findings,
      overcharge_output:     result.overcharge,
      contract_guard_output: result.contract_guard,
      is_public:             true,
      language:              detectedLanguage,
    })

    if (saveError) console.error('[analyze] DB save failed:', saveError.message)

    return json({ analysis_id: analysisId, result }, 200, req)
  } catch (err) {
    console.error('[analyze] Error:', err)
    return json({ error: 'Analysis failed. Please try again.' }, 500, req)
  }
})
