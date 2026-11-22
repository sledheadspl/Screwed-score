import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/analysis-for-document?document_id=<uuid>
 *
 * Lets the scan page recover a result when the browser lost the analyze
 * request (phone locked, tab backgrounded, flaky connection) even though the
 * edge function finished and saved the analysis. Returns only the id of the
 * newest public analysis for that document; the result itself is read from
 * the public /r/[id] page, which already shows every public analysis.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const documentId = req.nextUrl.searchParams.get('document_id') ?? ''
  if (!UUID_RE.test(documentId)) {
    return NextResponse.json({ error: 'Invalid document_id' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('id')
    .eq('document_id', documentId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  return NextResponse.json(
    { analysis_id: data?.id ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
