import { NextRequest, NextResponse } from 'next/server'
import { randomUUID, randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const COOKIE = 'gss_sid'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Session identity for anonymous document history.
 *
 * This is the ONLY source of identity for these routes. It used to accept a
 * `session_id` query parameter and fall back to the `x-forwarded-for` header —
 * both caller-controlled, which meant "whose documents am I reading?" was
 * decided by the requester rather than the server. Since the route runs on the
 * service-role key (RLS does not apply) and returns full document HTML, that
 * was a data-exposure bug, not just a smell.
 *
 * The id now lives in an HttpOnly cookie the server mints with a CSPRNG, so a
 * caller can neither read it from JS nor name someone else's.
 */
function readSession(req: NextRequest): string | null {
  return req.cookies.get(COOKIE)?.value ?? null
}

function attachSession(res: NextResponse, sessionId: string): NextResponse {
  res.cookies.set(COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
  return res
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}

// Share slugs are unguessable capability tokens — /doc/[slug] serves the full
// document to anyone holding one. Math.random() is not a CSPRNG and every slug
// came from a single process's stream, so observed slugs leaked future ones.
function generateSlug(): string {
  return randomBytes(16).toString('base64url')
}

// GET /api/documents — history for the caller's own session
export async function GET(req: NextRequest) {
  const sessionId = readSession(req)

  // No cookie yet means no documents yet. Mint one so the next save lands in a
  // stable session.
  if (!sessionId) {
    return attachSession(NextResponse.json({ documents: [] }), randomUUID())
  }

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
  const body = await req.json().catch(() => null)
  if (!body?.html || !body?.doc_type || !body?.doc_label) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const existing = readSession(req)
  const sessionId = existing ?? randomUUID()

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('generated_documents')
    .insert({
      session_id: sessionId,
      doc_type:   body.doc_type,
      doc_label:  body.doc_label,
      html:       body.html,
      preview:    stripHtml(body.html),
      share_slug: generateSlug(),
    })
    .select('id, share_slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const res = NextResponse.json({ id: data.id, share_slug: data.share_slug })
  return existing ? res : attachSession(res, sessionId)
}

// DELETE /api/documents?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const sessionId = readSession(req)
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (!sessionId) return NextResponse.json({ error: 'No session' }, { status: 403 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('generated_documents')
    .delete()
    .eq('id', id)
    .eq('session_id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
