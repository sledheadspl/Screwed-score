import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { extractTextFromBuffer, checkMagicBytes } from '@/lib/extract'
import { detectDocumentType } from '@/lib/detect'
import { verifyToken } from '@/app/api/verify-checkout/route'
import type { UploadResponse } from '@/lib/types'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
])

/** Anonymous users: 2 analyses per IP per 24 hours. Pro users: unlimited. */
const ANON_LIMIT  = 2
const WINDOW_MS   = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient()

    // ── 1. Pro token check — bypass rate limit for paying customers ─────────
    const proToken = req.cookies.get('gss_pro')?.value
    const isPro = proToken ? verifyToken(proToken) : false

    // ── 2. Rate limiting (skipped for Pro) ──────────────────────────────────
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
    // Use full SHA-256 hex (64 chars) — truncation reduces entropy unnecessarily
    const { createHash } = await import('crypto')
    const ipHash = createHash('sha256').update(ip).digest('hex')

    let rateData: { analyses_count: number; window_start: string } | null = null

    if (!isPro) {
      const { data } = await supabase
        .from('rate_limits')
        .select('analyses_count, window_start')
        .eq('ip_hash', ipHash)
        .maybeSingle()
      rateData = data

      if (rateData) {
        const windowAge = Date.now() - new Date(rateData.window_start).getTime()
        const windowActive = windowAge < WINDOW_MS
        if (windowActive && rateData.analyses_count >= ANON_LIMIT) {
          return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 429 })
        }
        // Reset stale window so increment below starts fresh
        if (!windowActive) rateData = null
      }
    }

    // ── 2. Parse and validate form data ────────────────────────────────────
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // ── 3. Magic byte validation (guards against MIME spoofing) ────────────
    try {
      checkMagicBytes(buffer, file.type)
    } catch {
      return NextResponse.json(
        { error: 'File content does not match the declared file type' },
        { status: 400 }
      )
    }

    // ── 4. Extract text ─────────────────────────────────────────────────────
    const extractedText = await extractTextFromBuffer(buffer, file.type)

    if (!extractedText || extractedText.trim().length < 20) {
      return NextResponse.json(
        { error: 'Could not extract readable text from this file' },
        { status: 422 }
      )
    }

    // ── 5. Detect document type ─────────────────────────────────────────────
    const documentType = detectDocumentType(extractedText, file.name)

    // ── 6. Upload to Supabase Storage ───────────────────────────────────────
    // Sanitize filename — strip path components and non-safe chars
    const safeName = file.name
      .replace(/.*[/\\]/, '')            // strip any path prefix
      .replace(/[^a-zA-Z0-9._-]/g, '_') // allow only safe chars
      .slice(0, 80)

    const storageId   = randomUUID()
    const storagePath = `uploads/${ipHash.slice(0, 16)}/${storageId}-${safeName}`

    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (storageError) {
      // Non-fatal: proceed without a stored file.
      // analysis can still run from extracted text already in memory.
      console.warn('Storage upload failed (non-fatal):', storageError.message)
    }

    // ── 7. Persist document record ──────────────────────────────────────────
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        original_file_name: file.name.slice(0, 255),
        // Only store the path if the upload actually succeeded
        storage_path:    storageError ? null : storagePath,
        mime_type:       file.type,
        extracted_text:  extractedText, // stored server-side only, never returned to client
        document_type:   documentType,
        file_size_bytes: file.size,
        ip_hash:         ipHash,
      })
      .select('id')
      .single()

    if (docError || !doc) {
      throw new Error(`Failed to persist document: ${docError?.message ?? 'unknown error'}`)
    }

    // ── 8. Atomic rate limit increment (skipped for Pro) ────────────────────
    if (!isPro) {
      const now = new Date().toISOString()
      const windowExpired = !rateData ||
        Date.now() - new Date(rateData.window_start).getTime() >= WINDOW_MS

      await supabase.from('rate_limits').upsert(
        {
          ip_hash:         ipHash,
          analyses_count:  windowExpired ? 1 : (rateData!.analyses_count + 1),
          window_start:    windowExpired ? now : rateData!.window_start,
          updated_at:      now,
        },
        { onConflict: 'ip_hash' }
      )
    }

    // NOTE: extracted_text is intentionally NOT returned to the client.
    // The analyze route fetches it from the DB using document_id.
    const response: UploadResponse = {
      document_id:   doc.id,
      document_type: documentType,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[upload] Unhandled error:', err)
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}
