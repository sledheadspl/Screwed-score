import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerClient } from '@supabase/ssr'
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

/** Anonymous users: 2 analyses per IP per 24 hours. */
const ANON_LIMIT   = 2
/** Authenticated (signed-in) users: 5 analyses per user per 24 hours. */
const AUTH_LIMIT   = 5
const WINDOW_MS    = 24 * 60 * 60 * 1000

/**
 * Returns the real client IP.
 * Prefers platform-set headers (x-real-ip, cf-connecting-ip) over x-forwarded-for
 * to prevent clients from spoofing their IP by injecting custom headers.
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    // Rightmost entry in x-forwarded-for is the last trusted proxy — most reliable
    // when x-real-ip is not available
    req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    '0.0.0.0'
  )
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient()

    // ── 1. Pro token check — bypass rate limit for paying customers ─────────
    let isPro = false
    const proToken = req.cookies.get('gss_pro')?.value
    if (proToken) {
      const subscriptionId = verifyToken(proToken)
      if (subscriptionId) {
        // Verify the subscription has not been revoked (cancelled / payment failed)
        const { data: revoked } = await supabase
          .from('revoked_subscriptions')
          .select('subscription_id')
          .eq('subscription_id', subscriptionId)
          .maybeSingle()
        isPro = !revoked
      }
    }

    // ── 2. Auth check — signed-in users get a higher free-tier limit ─────────
    let userId: string | null = null
    if (!isPro) {
      const authClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => req.cookies.getAll(),
            setAll: () => {}, // read-only — we never set cookies here
          },
        }
      )
      const { data: { user } } = await authClient.auth.getUser()
      userId = user?.id ?? null
    }

    // ── 3. Rate limiting (skipped for Pro) ──────────────────────────────────
    const { createHash } = await import('crypto')
    const ip     = getClientIp(req)
    const ipHash = createHash('sha256').update(ip).digest('hex')

    // Authenticated users tracked by user_id so limit doesn't bleed across devices;
    // anonymous users tracked by IP hash.
    const rateLimitKey = userId ? `user:${userId}` : ipHash
    const limit        = userId ? AUTH_LIMIT : ANON_LIMIT

    let rateData: { analyses_count: number; window_start: string } | null = null

    if (!isPro) {
      const { data } = await supabase
        .from('rate_limits')
        .select('analyses_count, window_start')
        .eq('ip_hash', rateLimitKey)
        .maybeSingle()
      rateData = data

      if (rateData) {
        const windowAge = Date.now() - new Date(rateData.window_start).getTime()
        if (windowAge < WINDOW_MS && rateData.analyses_count >= limit) {
          return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 429 })
        }
      }
    }

    // ── 4. Parse and validate form data ────────────────────────────────────
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

    // ── 5. Magic byte validation (guards against MIME spoofing) ────────────
    try {
      checkMagicBytes(buffer, file.type)
    } catch {
      return NextResponse.json(
        { error: 'File content does not match the declared file type' },
        { status: 400 }
      )
    }

    // ── 6. Extract text ─────────────────────────────────────────────────────
    const extractedText = await extractTextFromBuffer(buffer, file.type)

    if (!extractedText || extractedText.trim().length < 20) {
      return NextResponse.json(
        { error: 'Could not extract readable text from this file' },
        { status: 422 }
      )
    }

    // ── 7. Detect document type ─────────────────────────────────────────────
    const documentType = detectDocumentType(extractedText, file.name)

    // ── 8. Upload to Supabase Storage ───────────────────────────────────────
    const safeName = file.name
      .replace(/.*[/\\]/, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80)

    const storageId   = randomUUID()
    const storagePath = `uploads/${ipHash.slice(0, 16)}/${storageId}-${safeName}`

    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (storageError) {
      console.warn('Storage upload failed (non-fatal):', storageError.message)
    }

    // ── 9. Persist document record ──────────────────────────────────────────
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        original_file_name: file.name.slice(0, 255),
        storage_path:       storageError ? null : storagePath,
        mime_type:          file.type,
        extracted_text:     extractedText, // stored server-side only, never returned to client
        document_type:      documentType,
        file_size_bytes:    file.size,
        ip_hash:            ipHash,
        user_id:            userId ?? undefined,
      })
      .select('id')
      .single()

    if (docError || !doc) {
      throw new Error('Failed to persist document')
    }

    // ── 10. Atomic rate limit increment (skipped for Pro) ────────────────────
    if (!isPro) {
      const now = new Date().toISOString()
      const windowExpired = !rateData ||
        Date.now() - new Date(rateData.window_start).getTime() >= WINDOW_MS

      await supabase.from('rate_limits').upsert(
        {
          ip_hash:         rateLimitKey,
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
