// ─── Document ────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'mechanic_invoice'
  | 'contractor_estimate'
  | 'insurance_quote'
  | 'medical_bill'
  | 'dental_bill'
  | 'phone_bill'
  | 'internet_bill'
  | 'lease_agreement'
  | 'brand_deal'
  | 'employment_contract'
  | 'service_agreement'
  | 'unknown'

export const DOCUMENT_TYPES = new Set<string>([
  'mechanic_invoice', 'contractor_estimate', 'insurance_quote',
  'medical_bill', 'dental_bill', 'phone_bill', 'internet_bill',
  'lease_agreement', 'brand_deal', 'employment_contract',
  'service_agreement', 'unknown',
])

export function isDocumentType(v: unknown): v is DocumentType {
  return typeof v === 'string' && DOCUMENT_TYPES.has(v)
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  mechanic_invoice:     'Mechanic Invoice',
  contractor_estimate:  'Contractor Estimate',
  insurance_quote:      'Insurance Quote',
  medical_bill:         'Medical Bill',
  dental_bill:          'Dental Bill',
  phone_bill:           'Phone/Internet Bill',
  internet_bill:        'Internet Bill',
  lease_agreement:      'Lease Agreement',
  brand_deal:           'Brand Deal',
  employment_contract:  'Employment Contract',
  service_agreement:    'Service Agreement',
  unknown:              'Document',
}

// ─── ContractGuard Output (reuse existing schema) ────────────────────────────

export interface ContractGuardOutput {
  contract_type: string
  parties?: {
    party_a?: { name?: string; role?: string }
    party_b?: { name?: string; role?: string }
  }
  dates?: { effective?: string | null; expiration?: string | null }
  financial_commitment?: { amount?: number | null; currency?: string; breakdown?: string }
  plain_english_summary: string
  key_terms: Array<{
    term_name: string
    original_text: string
    plain_english: string
    your_obligation?: string
  }>
  red_flags: Array<{
    title: string
    clause_text: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    issue: string
    negotiation_script?: string
    alternative_language?: string
  }>
  green_flags: Array<{
    title: string
    clause_text: string
    why_good: string
  }>
  missing_protections: Array<{
    protection_name: string
    why_important: string
    risk_without_it: string
    suggested_language?: string
  }>
  overall_grade: 'A' | 'B' | 'C' | 'D' | 'F'
  questions_to_ask: string[]
  pro_tips: string[]
}

// ─── Overcharge Detection ────────────────────────────────────────────────────

export interface LineItemAnalysis {
  description: string
  charged_amount: number | null
  flagged: boolean
  flag_reason?: string | null
  industry_context?: string | null
  severity: 'high' | 'medium' | 'low' | null
}

export interface OverchargeOutput {
  document_type: DocumentType
  line_items: LineItemAnalysis[]
  total_flagged_amount: number
  total_charged_amount: number
  industry_range_note: string
  top_concerns: string[]
  summary: string
}

// ─── Screwed Score ────────────────────────────────────────────────────────────

export type ScrewedScore = 'SCREWED' | 'MAYBE' | 'SAFE'

export type FindingCategory =
  | 'overcharge'
  | 'vague_terms'
  | 'duplicate_charge'
  | 'risky_clause'
  | 'missing_protection'
  | 'deceptive_language'

export type FindingSeverity = 'high' | 'medium' | 'low'

export interface Finding {
  severity: FindingSeverity
  category: FindingCategory
  title: string
  description: string
  original_text?: string
  suggested_fix?: string
  dollar_impact?: number
}

// ─── Full Analysis Result ─────────────────────────────────────────────────────

export interface AnalysisResult {
  id: string
  document_type: DocumentType
  screwed_score: ScrewedScore
  screwed_score_reason: string
  screwed_score_percent: number
  top_findings: Finding[]
  overcharge: OverchargeOutput
  contract_guard: ContractGuardOutput
  plain_summary: string
  what_they_tried: string[]
  what_to_do_next: string[]
  created_at: string
  is_public: boolean
}

// ─── API Shapes ───────────────────────────────────────────────────────────────

/** Returned after a successful file upload. extracted_text is NOT returned to the client. */
export interface UploadResponse {
  document_id: string
  document_type: DocumentType
}

/** Client sends only the document_id. Text is fetched server-side. */
export interface AnalyzeRequest {
  document_id: string
  language?: string
}

export interface AnalyzeResponse {
  analysis_id: string
  result: Omit<AnalysisResult, 'created_at'>
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type AppPhase =
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'analyzing'
  | 'done'
  | 'error'

export interface AppState {
  phase: AppPhase
  progress: number
  progressLabel: string
  analysisId: string | null
  result: AnalysisResult | null
  error: string | null
  /** Populated after upload so the analyze step knows the document type */
  documentType: DocumentType | null
}
