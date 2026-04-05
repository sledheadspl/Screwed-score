export type DisputeStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type DisputeCategory =
  | 'overcharge'
  | 'unauthorized_charge'
  | 'billing_error'
  | 'poor_service'
  | 'contract_violation'
  | 'other'

export const DISPUTE_CATEGORIES = new Set<string>([
  'overcharge', 'unauthorized_charge', 'billing_error',
  'poor_service', 'contract_violation', 'other',
])

export interface Dispute {
  id: string
  vendor_id: string | null
  user_id: string | null
  analysis_id: string | null
  category: DisputeCategory
  status: DisputeStatus
  title: string
  description: string
  amount_disputed: number | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

export interface DisputeMessage {
  id: string
  dispute_id: string
  author_id: string | null
  is_vendor_rep: boolean
  body: string
  created_at: string
}

export interface DisputeWithMessages extends Dispute {
  messages: DisputeMessage[]
  vendor_name?: string | null
}

export interface CreateDisputeRequest {
  vendor_id?: string
  analysis_id?: string
  category: DisputeCategory
  title: string
  description: string
  amount_disputed?: number
}

export interface ReplyToDisputeRequest {
  body: string
  is_vendor_rep?: boolean
}

export interface ResolveDisputeRequest {
  resolution_notes: string
}
