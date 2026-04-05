export type AutomationJobType =
  | 'text_generation'
  | 'invoice_analysis'
  | 'summary'
  | 'generic'

export type AutomationJobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'

export type RiskLevel = 'High' | 'Moderate' | 'Low'

export interface AutomationJob {
  id: string
  type: AutomationJobType
  status: AutomationJobStatus
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  created_at: string
  completed_at: string | null
}

export interface RunAutomationRequest {
  type: AutomationJobType
  input: Record<string, unknown>
}

export interface RunAutomationResponse {
  job_id: string
  status: AutomationJobStatus
  output: Record<string, unknown> | null
  error: string | null
}

export const AUTOMATION_JOB_TYPES = new Set<string>([
  'text_generation', 'invoice_analysis', 'summary', 'generic',
])

export function isAutomationJobType(v: unknown): v is AutomationJobType {
  return typeof v === 'string' && AUTOMATION_JOB_TYPES.has(v)
}
