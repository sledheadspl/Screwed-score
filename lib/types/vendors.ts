export type VendorCategory =
  | 'mechanic'
  | 'contractor'
  | 'medical'
  | 'dental'
  | 'insurance'
  | 'telecom'
  | 'legal'
  | 'financial'
  | 'other'

export const VENDOR_CATEGORIES = new Set<string>([
  'mechanic', 'contractor', 'medical', 'dental',
  'insurance', 'telecom', 'legal', 'financial', 'other',
])

export function isVendorCategory(v: unknown): v is VendorCategory {
  return typeof v === 'string' && VENDOR_CATEGORIES.has(v)
}

export interface Vendor {
  id: string
  name: string
  category: VendorCategory
  city: string | null
  state: string | null
  zip: string | null
  website: string | null
  phone: string | null
  created_by: string | null
  claimed_by: string | null
  claimed_at: string | null
  verified: boolean
  bio: string | null
  tagline: string | null
  logo_url: string | null
  response_statement: string | null
  created_at: string
  updated_at: string
}

export interface VendorReputation {
  vendor_id: string
  total_analyses: number
  screwed_count: number
  maybe_count: number
  safe_count: number
  avg_screwed_percent: number
  total_flagged_amount: number
  ai_summary: string | null
  last_computed_at: string | null
}

export interface VendorWithReputation extends Vendor {
  reputation: VendorReputation | null
}

export interface CreateVendorRequest {
  name: string
  category: VendorCategory
  city?: string
  state?: string
  zip?: string
  website?: string
  phone?: string
}

export interface VendorSearchParams {
  q?: string
  category?: VendorCategory
  state?: string
  claimed_by?: string
  claimedOnly?: boolean
  limit?: number
  offset?: number
}
