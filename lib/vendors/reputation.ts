/**
 * Vendor Reputation Engine
 * Aggregates analyses linked to a vendor and computes a reputation score.
 * Server-side only.
 */
import { createServiceClient } from '@/lib/supabase'
import { generateVendorReputationSummary } from '@/lib/content/generator'
import type { VendorReputation } from '@/lib/types/vendors'

export async function computeVendorReputation(vendorId: string): Promise<VendorReputation> {
  const supabase = createServiceClient()

  // Fetch vendor info for the AI summary
  const { data: vendor } = await supabase
    .from('vendors')
    .select('name, category')
    .eq('id', vendorId)
    .single()

  // Aggregate analyses linked to this vendor
  const { data: rows, error } = await supabase
    .from('analyses')
    .select('screwed_score, screwed_score_percent, overcharge_output')
    .eq('vendor_id', vendorId)

  if (error) throw new Error(error.message)

  const analyses = rows ?? []
  const totalAnalyses = analyses.length

  let screwedCount = 0
  let maybeCount = 0
  let safeCount = 0
  let totalScrewedPercent = 0
  let totalFlaggedAmount = 0

  for (const a of analyses) {
    if (a.screwed_score === 'SCREWED') screwedCount++
    else if (a.screwed_score === 'MAYBE') maybeCount++
    else safeCount++

    totalScrewedPercent += a.screwed_score_percent ?? 0

    const overcharge = a.overcharge_output as { total_flagged_amount?: number } | null
    totalFlaggedAmount += overcharge?.total_flagged_amount ?? 0
  }

  const avgScrewedPercent = totalAnalyses > 0 ? totalScrewedPercent / totalAnalyses : 0

  let aiSummary: string | null = null
  if (totalAnalyses > 0 && vendor) {
    try {
      aiSummary = await generateVendorReputationSummary({
        vendorName: vendor.name,
        category: vendor.category,
        totalAnalyses,
        screwedCount,
        maybeCount,
        safeCount,
        avgScrewedPercent,
        totalFlaggedAmount,
      })
    } catch {
      // Non-fatal — reputation data still returned without AI summary
    }
  }

  const reputation: VendorReputation = {
    vendor_id: vendorId,
    total_analyses: totalAnalyses,
    screwed_count: screwedCount,
    maybe_count: maybeCount,
    safe_count: safeCount,
    avg_screwed_percent: Math.round(avgScrewedPercent * 10) / 10,
    total_flagged_amount: Math.round(totalFlaggedAmount * 100) / 100,
    ai_summary: aiSummary,
    last_computed_at: new Date().toISOString(),
  }

  // Upsert into vendor_reputations table (non-fatal if fails)
  await supabase
    .from('vendor_reputations')
    .upsert(reputation, { onConflict: 'vendor_id' })

  return reputation
}

export async function getVendorReputation(vendorId: string): Promise<VendorReputation | null> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('vendor_reputations')
    .select('*')
    .eq('vendor_id', vendorId)
    .single()

  return data as VendorReputation | null
}
