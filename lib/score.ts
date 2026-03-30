/**
 * Screwed Score computation.
 * Pure functions — no side effects, fully unit-testable.
 */

import type {
  ContractGuardOutput,
  OverchargeOutput,
  ScrewedScore,
  FindingSeverity,
  Finding,
  AnalysisResult,
  DocumentType,
} from './types'

// ─── Score Computation ────────────────────────────────────────────────────────

export function computeScrewedScore(
  cg: ContractGuardOutput,
  oc: OverchargeOutput
): { score: ScrewedScore; reason: string; percent: number } {
  let points = 0

  const redFlags = cg.red_flags ?? []
  const missingProtections = cg.missing_protections ?? []
  const lineItems = oc.line_items ?? []

  // ContractGuard signals
  const criticalFlags = redFlags.filter(f => f.severity === 'critical').length
  const highFlags     = redFlags.filter(f => f.severity === 'high').length
  const mediumFlags   = redFlags.filter(f => f.severity === 'medium').length

  points += criticalFlags * 25
  points += highFlags     * 15
  points += mediumFlags   *  8
  points += missingProtections.length * 5

  const gradePoints: Record<string, number> = { A: 0, B: 5, C: 15, D: 25, F: 40 }
  points += gradePoints[cg.overall_grade] ?? 0

  // Overcharge signals
  const flaggedItems     = lineItems.filter(i => i.flagged)
  const highFlaggedItems = flaggedItems.filter(i => i.severity === 'high').length
  const medFlaggedItems  = flaggedItems.filter(i => i.severity === 'medium').length

  points += highFlaggedItems * 20
  points += medFlaggedItems  * 10

  const flaggedAmount = oc.total_flagged_amount ?? 0
  if      (flaggedAmount > 1000) points += 20
  else if (flaggedAmount > 500)  points += 15
  else if (flaggedAmount > 100)  points +=  8

  const percent = Math.min(100, points)

  let score: ScrewedScore
  let reason: string

  if (percent >= 50) {
    score  = 'SCREWED'
    reason = buildScrewedReason(criticalFlags, highFlags, flaggedAmount, cg.overall_grade)
  } else if (percent >= 20) {
    score  = 'MAYBE'
    reason = buildMaybeReason(highFlags, mediumFlags, flaggedAmount)
  } else {
    score  = 'SAFE'
    reason = buildSafeReason(cg)
  }

  return { score, reason, percent }
}

function buildScrewedReason(
  criticalFlags: number,
  highFlags: number,
  flaggedAmount: number,
  grade: string
): string {
  const parts: string[] = []
  if (criticalFlags > 0) parts.push(`${criticalFlags} critical clause${criticalFlags > 1 ? 's' : ''} that heavily favor the other party`)
  if (highFlags > 0)     parts.push(`${highFlags} high-severity red flag${highFlags > 1 ? 's' : ''}`)
  if (flaggedAmount > 0) parts.push(`$${flaggedAmount.toFixed(0)} in suspicious charges`)
  if (grade === 'D' || grade === 'F') parts.push(`an overall grade of ${grade}`)
  return parts.length > 0
    ? `This document has ${parts.join(', ')}.`
    : 'Multiple serious issues detected in this document.'
}

function buildMaybeReason(
  highFlags: number,
  mediumFlags: number,
  flaggedAmount: number
): string {
  const parts: string[] = []
  if (highFlags > 0)     parts.push(`${highFlags} high-severity flag${highFlags > 1 ? 's' : ''}`)
  if (mediumFlags > 0)   parts.push(`${mediumFlags} medium-severity concern${mediumFlags > 1 ? 's' : ''}`)
  if (flaggedAmount > 0) parts.push(`$${flaggedAmount.toFixed(0)} in potentially inflated charges`)
  return parts.length > 0
    ? `Some concerns worth reviewing: ${parts.join(', ')}.`
    : 'A few things in this document deserve a closer look before you sign or pay.'
}

function buildSafeReason(cg: ContractGuardOutput): string {
  const greenCount = (cg.green_flags ?? []).length
  if (greenCount > 0) {
    return `This document looks reasonable. ${greenCount} protective clause${greenCount > 1 ? 's' : ''} found in your favor.`
  }
  return 'No major red flags detected. Still review the terms carefully before signing.'
}

// ─── Build Findings ───────────────────────────────────────────────────────────

export function buildFindings(
  cg: ContractGuardOutput,
  oc: OverchargeOutput
): Finding[] {
  const findings: Finding[] = []

  // ContractGuard red flags
  for (const flag of cg.red_flags ?? []) {
    const severity: FindingSeverity =
      flag.severity === 'critical' || flag.severity === 'high' ? 'high'
      : flag.severity === 'medium' ? 'medium'
      : 'low'

    findings.push({
      severity,
      category: 'risky_clause',
      title: flag.title,
      description: flag.issue,
      original_text: flag.clause_text,
      suggested_fix: flag.alternative_language,
    })
  }

  // Overcharge line items
  const VALID_SEVERITIES = new Set<string>(['high', 'medium', 'low'])
  for (const item of (oc.line_items ?? []).filter(i => i.flagged)) {
    const rawSeverity = item.severity ?? 'medium'
    const severity: FindingSeverity = VALID_SEVERITIES.has(rawSeverity)
      ? (rawSeverity as FindingSeverity)
      : 'medium'

    findings.push({
      severity,
      category: 'overcharge',
      title: `Suspicious charge: ${item.description}`,
      description: item.flag_reason ?? 'This charge appears higher than expected',
      original_text: item.charged_amount != null ? `Charged: $${item.charged_amount}` : undefined,
      suggested_fix: item.industry_context ?? undefined,
      dollar_impact: item.charged_amount ?? undefined,
    })
  }

  // Missing protections (capped at 3 to avoid overwhelming the list)
  for (const protection of (cg.missing_protections ?? []).slice(0, 3)) {
    findings.push({
      severity: 'medium',
      category: 'missing_protection',
      title: `Missing: ${protection.protection_name}`,
      description: protection.why_important,
      suggested_fix: protection.suggested_language,
    })
  }

  const order: Record<FindingSeverity, number> = { high: 0, medium: 1, low: 2 }
  return findings.sort((a, b) => order[a.severity] - order[b.severity])
}

// ─── Build "What They Tried" ──────────────────────────────────────────────────

export function buildWhatTheyTried(
  cg: ContractGuardOutput,
  oc: OverchargeOutput
): string[] {
  const bullets = new Set<string>()

  // Lead with the worst flag
  const topFlag = (cg.red_flags ?? []).find(
    f => f.severity === 'critical' || f.severity === 'high'
  )
  if (topFlag) bullets.add(topFlag.issue)

  // Top overcharge
  const topCharge = (oc.line_items ?? []).find(i => i.flagged && i.severity === 'high')
  if (topCharge?.flag_reason) bullets.add(topCharge.flag_reason)

  // Top missing protection
  const topMissing = (cg.missing_protections ?? [])[0]
  if (topMissing) bullets.add(`Left out ${topMissing.protection_name}: ${topMissing.why_important}`)

  // Fill remaining slots with other red flags (skip ones already added)
  for (const flag of cg.red_flags ?? []) {
    if (bullets.size >= 3) break
    bullets.add(flag.issue)
  }

  return [...bullets].slice(0, 3)
}

// ─── Build "What To Do Next" ──────────────────────────────────────────────────

export function buildWhatToDoNext(
  cg: ContractGuardOutput,
  oc: OverchargeOutput
): string[] {
  const steps: string[] = []

  const flaggedAmount = oc.total_flagged_amount ?? 0
  if (flaggedAmount > 0) {
    steps.push(`Ask for an itemized breakdown of the $${flaggedAmount.toFixed(0)} in flagged charges before paying`)
  }

  const firstQuestion = (cg.questions_to_ask ?? [])[0]
  if (firstQuestion) steps.push(firstQuestion)

  if ((cg.red_flags ?? []).some(f => f.severity === 'critical')) {
    steps.push('Do not sign or pay until the critical clauses are addressed in writing')
  } else if ((cg.red_flags ?? []).some(f => f.severity === 'high')) {
    steps.push('Request revisions to the high-severity clauses before agreeing')
  }

  const firstTip = (cg.pro_tips ?? [])[0]
  if (firstTip) steps.push(firstTip)

  return steps.slice(0, 4)
}

// ─── Assemble Full Result ─────────────────────────────────────────────────────

export function assembleResult(
  id: string,
  documentType: DocumentType,
  cg: ContractGuardOutput,
  oc: OverchargeOutput
): Omit<AnalysisResult, 'created_at'> {
  const { score, reason, percent } = computeScrewedScore(cg, oc)

  return {
    id,
    document_type:          documentType,
    screwed_score:          score,
    screwed_score_reason:   reason,
    screwed_score_percent:  percent,
    top_findings:           buildFindings(cg, oc),
    overcharge:             oc,
    contract_guard:         cg,
    plain_summary:          cg.plain_english_summary ?? '',
    what_they_tried:        buildWhatTheyTried(cg, oc),
    what_to_do_next:        buildWhatToDoNext(cg, oc),
    is_public:              true,
  }
}
