/**
 * Vendor CRUD service.
 * Server-side only.
 */
import { createServiceClient } from '@/lib/supabase'
import type { Vendor, CreateVendorRequest, VendorSearchParams } from '@/lib/types/vendors'

export async function createVendor(
  data: CreateVendorRequest,
  userId: string | null
): Promise<Vendor> {
  const supabase = createServiceClient()

  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({
      name: data.name.trim(),
      category: data.category,
      city: data.city?.trim() ?? null,
      state: data.state?.trim() ?? null,
      zip: data.zip?.trim() ?? null,
      website: data.website?.trim() ?? null,
      phone: data.phone?.trim() ?? null,
      created_by: userId,
    })
    .select()
    .single()

  if (error || !vendor) throw new Error(error?.message ?? 'Failed to create vendor')
  return vendor as Vendor
}

export async function getVendorById(vendorId: string): Promise<Vendor | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .single()

  if (error || !data) return null
  return data as Vendor
}

export async function searchVendors(params: VendorSearchParams): Promise<Vendor[]> {
  const supabase = createServiceClient()
  const limit = Math.min(params.limit ?? 20, 50)
  const offset = params.offset ?? 0

  let query = supabase
    .from('vendors')
    .select('*')
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (params.q) {
    query = query.ilike('name', `%${params.q}%`)
  }
  if (params.category) {
    query = query.eq('category', params.category)
  }
  if (params.state) {
    query = query.eq('state', params.state.toUpperCase())
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Vendor[]
}
