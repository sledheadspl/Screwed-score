import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { runContractGuardAnalysis } from '@/lib/contractguard'
import { detectOvercharges } from '@/lib/overcharge'
import { assembleResult } from '@/lib/score'
import { isValidUUID } from '@/lib/utils'
import { isDocumentType } from '@/lib/types'
import type { AnalyzeRequest, DocumentType } from '@/lib/types'
import { sendGAEvent } from '@/lib/ga'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const body = req.body as AnalyzeRequest

    if (!body.document_id || typeof body.document_id !== 'string') {
      return res.status(400).json({ error: 'document_id is required' })
    }
    if (!isValidUUID(body.document_id)) {
      return res.status(400).json({ error: 'Invalid document_id format' })
    }

    const supabase = createServiceClient()

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, extracted_text, document_type')
      .eq('id', body.document_id)
      .maybeSingle()

    if (docError) {
      console.error('[analyze] DB fetch error:', docError.message)
      return res.status(500).json({ error: 'Failed to retrieve document' })
    }
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }
    if (!doc.extracted_text || doc.extracted_text.trim().length < 20) {
      return res.status(422).json({ error: 'Document has no readable text' })
    }

    const documentType: DocumentType = isDocumentType(doc.document_type)
      ? doc.document_type
      : 'unknown'

    // Run both AI calls in parallel to cut total time roughly in half
    const [cgOutput, overchargeOutput] = await Promise.all([
      runContractGuardAnalysis(doc.extracted_text, documentType),
      detectOvercharges(doc.extracted_text, documentType, null),
    ])
    const detectedLanguage = cgOutput.detected_language ?? 'en'

    const analysisId = randomUUID()
    const result = assembleResult(analysisId, documentType, cgOutput, overchargeOutput)

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

    if (saveError) {
      console.error('[analyze] Failed to persist analysis:', saveError.message)
    }

    await sendGAEvent('scan_complete', {
      score:                result.screwed_score,
      document_type:        result.document_type,
      screwed_score_percent: result.screwed_score_percent,
    })

    return res.status(200).json({ analysis_id: analysisId, result })
  } catch (err) {
    console.error('[analyze] Unhandled error:', err)
    return res.status(500).json({ error: 'Analysis failed. Please try again.' })
  }
}
