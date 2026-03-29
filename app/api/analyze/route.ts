import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { runContractGuardAnalysis } from '@/lib/contractguard'
import { detectOvercharges } from '@/lib/overcharge'
import { assembleResult } from '@/lib/score'
import { isValidUUID } from '@/lib/utils'
import { isDocumentType } from '@/lib/types'
import type { AnalyzeRequest, DocumentType } from '@/lib/types'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as AnalyzeRequest

    // ── 1. Validate inputs ──────────────────────────────────────────────────
    if (!body.document_id || typeof body.document_id !== 'string') {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 })
    }
    if (!isValidUUID(body.document_id)) {
      return NextResponse.json({ error: 'Invalid document_id format' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // ── 2. Fetch document from DB server-side ───────────────────────────────
    // SECURITY: we NEVER trust client-supplied text.
    // The extracted_text is only accessed server-side from the DB.
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, extracted_text, document_type')
      .eq('id', body.document_id)
      .maybeSingle()

    if (docError) {
      console.error('[analyze] DB fetch error:', docError.message)
      return NextResponse.json({ error: 'Failed to retrieve document' }, { status: 500 })
    }
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    if (!doc.extracted_text || doc.extracted_text.trim().length < 20) {
      return NextResponse.json({ error: 'Document has no readable text' }, { status: 422 })
    }

    const documentType: DocumentType = isDocumentType(doc.document_type)
      ? doc.document_type
      : 'unknown'

    // ── 3. Run analysis pipeline ────────────────────────────────────────────
    const cgOutput = await runContractGuardAnalysis(doc.extracted_text, documentType)

    const overchargeOutput = await detectOvercharges(
      doc.extracted_text,
      documentType,
      cgOutput
    )

    // ── 4. Assemble result ──────────────────────────────────────────────────
    const analysisId = randomUUID()
    const result     = assembleResult(analysisId, documentType, cgOutput, overchargeOutput)

    // ── 5. Persist to DB ────────────────────────────────────────────────────
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
    })

    if (saveError) {
      // Non-fatal: return result to user even if DB save fails.
      // They lose shareability but still get their analysis.
      console.error('[analyze] Failed to persist analysis:', saveError.message)
    }

    return NextResponse.json({ analysis_id: analysisId, result })
  } catch (err) {
    console.error('[analyze] Unhandled error:', err)
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}
