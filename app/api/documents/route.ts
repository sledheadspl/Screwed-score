import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

function getSessionId(req: NextRequest): string {
  return req.headers.get('x-session-id') ?? req.headers.get('x-forwarded-for') ?? 'anon'
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}

function generateSlug(): string {
  return Math.random().toString(36).slice(2, 9)
}

// GET /api/documents?session_id=xxx — load history for a session
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? getSessionId(req)
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('generated_documents')
    .select('id, doc_type, doc_label, html, preview, share_slug, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents: data ?? [] })
}

// POST /api/documents — save a generated document
export async function POST(req: NextRequest) {
  const sessionId = getSessionId(req)
  const body = await req.json().catch(() => null)
  if (!body?.html || !body?.doc_type || !body?.doc_label) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const slug = generateSlug()

  const { data, error } = await supabase
    .from('generated_documents')
    .insert({
      session_id: sessionId,
      doc_type:   body.doc_type,
      doc_label:  body.doc_label,
      html:       body.html,
      preview:    stripHtml(body.html),
      share_slug: slug,
    })
    .select('id, share_slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, share_slug: data.share_slug })
}

// DELETE /api/documents?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const sessionId = getSessionId(req)
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('generated_documents')
    .delete()
    .eq('id', id)
    .eq('session_id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
