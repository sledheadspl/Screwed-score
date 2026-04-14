import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import { readFileSync } from 'fs'
import { randomUUID, createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { extractTextFromBuffer, checkMagicBytes } from '@/lib/extract'
import { detectDocumentType } from '@/lib/detect'
import { verifyToken } from '@/lib/auth'
import type { UploadResponse } from '@/lib/types'

// Disable Next.js body parser — formidable reads the raw stream directly
export const config = { api: { bodyParser: false } }

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
const ANON_LIMIT = 2
/** Authenticated (signed-in) users: 5 analyses per user per 24 hours. */
const AUTH_LIMIT = 5
const WINDOW_MS  = 24 * 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const supabase = createServiceClient()

    // ── 1. Auth lookup (once) — used for Pro profile check + rate limit key ──
    const authToken = req.headers['x-supabase-token'] as string | undefined
    let userId: string | null = null

    if (authToken) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const userClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await userClient.auth.getUser(authToken)
        userId = user?.id ?? null
      } catch { /* non-fatal */ }
    }

    // ── 2. Pro check — cookie token OR active profile subscription ────────────
    const proToken = req.cookies['gss_pro']
    let isPro = proToken ? verifyToken(proToken) : false

    if (!isPro && userId) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, subscription_status')
          .eq('id', userId)
          .maybeSingle()
        if (profile?.plan === 'pro' && profile?.subscription_status === 'active') {
          isPro = true
        }
      } catch { /* non-fatal */ }
    }

    // ── 3. Referral token bypass check ──────────────────────────────────────
    const refToken = req.headers['x-ref-token'] as string | undefined
    let refBypassed = false

    if (!isPro && refToken) {
      const { data: refRow } = await supabase
        .from('referral_tokens')
        .select('id, used')
        .eq('token', refToken)
        .maybeSingle()

      if (refRow && !refRow.used) {
        const { error: consumeErr } = await supabase
          .from('referral_tokens')
          .update({ used: true, used_at: new Date().toISOString() })
          .eq('id', refRow.id)
          .eq('used', false) // guard against race condition
        if (!consumeErr) refBypassed = true
      }
    }

    // ── 4. Rate limiting (skipped for Pro or valid referral) ─────────────────
    // Prefer x-real-ip (set by reverse proxy) over x-forwarded-for to prevent spoofing
    const ip = (req.headers['x-real-ip'] as string) ??
      (req.headers['cf-connecting-ip'] as string) ??
      (req.headers['x-forwarded-for'] as string)?.split(',').at(-1)?.trim() ??
      '0.0.0.0'
    const ipHash = createHash('sha256').update(ip).digest('hex')

    // Auth users tracked by user_id; anon by IP hash
    const rateLimitKey = userId ? `user:${userId}` : ipHash
    const limit        = userId ? AUTH_LIMIT : ANON_LIMIT

    let rateData: { request_count: number; window_start: string } | null = null

    if (!isPro && !refBypassed) {
      const { data } = await supabase
        .from('rate_limits')
        .select('request_count, window_start')
        .eq('ip_hash', rateLimitKey)
        .maybeSingle()
      rateData = data

      if (rateData) {
        const windowAge    = Date.now() - new Date(rateData.window_start).getTime()
        const windowActive = windowAge < WINDOW_MS
        if (windowActive && rateData.request_count >= limit) {
          return res.status(429).json({ error: 'LIMIT_REACHED' })
        }
        if (!windowActive) rateData = null
      }
    }

    // ── 5. Parse multipart form data with formidable ─────────────────────────
    const form = formidable({ maxFileSize: MAX_FILE_SIZE_BYTES, keepExtensions: true })
    const [, files] = await form.parse(req)
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file provided' })
    }
    if (uploadedFile.size === 0) {
      return res.status(400).json({ error: 'File is empty' })
    }
    if (!ALLOWED_MIME_TYPES.has(uploadedFile.mimetype ?? '')) {
      return res.status(400).json({ error: 'Unsupported file type' })
    }

    const buffer = readFileSync(uploadedFile.filepath)

    // ── 4. Magic byte validation (guards against MIME spoofing) ────────────
    try {
      checkMagicBytes(buffer, uploadedFile.mimetype ?? '')
    } catch {
      return res.status(400).json({
        error: 'File content does not match the declared file type',
      })
    }

    // ── 5. Extract text ─────────────────────────────────────────────────────
    const extractedText = await extractTextFromBuffer(buffer, uploadedFile.mimetype ?? '')

    if (!extractedText || extractedText.trim().length < 20) {
      return res.status(422).json({
        error: 'Could not extract readable text from this file',
      })
    }

    // ── 6. Detect document type ─────────────────────────────────────────────
    const documentType = detectDocumentType(extractedText, uploadedFile.originalFilename ?? '')

    // ── 7. Upload to Supabase Storage ───────────────────────────────────────
    const safeName = (uploadedFile.originalFilename ?? 'upload')
      .replace(/.*[/\\]/, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '_')
      .slice(0, 80)

    const storageId   = randomUUID()
    const storagePath = `uploads/${ipHash.slice(0, 16)}/${storageId}-${safeName}`

    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: uploadedFile.mimetype ?? '',
        upsert: false,
      })

    if (storageError) {
      console.warn('Storage upload failed (non-fatal):', storageError.message)
    }

    // ── 8. Persist document record ──────────────────────────────────────────
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        original_file_name: (uploadedFile.originalFilename ?? 'upload').slice(0, 255),
        storage_path:       storageError ? null : storagePath,
        mime_type:          uploadedFile.mimetype ?? '',
        extracted_text:     extractedText,
        document_type:      documentType,
        file_size_bytes:    uploadedFile.size,
        ip_hash:            ipHash,
        user_id:            userId ?? undefined,
      })
      .select('id')
      .single()

    if (docError || !doc) {
      throw new Error(`Failed to persist document: ${docError?.message ?? 'unknown error'}`)
    }

    // ── 9. Atomic rate limit increment (skipped for Pro or referral bypass) ──
    if (!isPro && !refBypassed) {
      const now           = new Date().toISOString()
      const windowExpired = !rateData ||
        Date.now() - new Date(rateData.window_start).getTime() >= WINDOW_MS

      await supabase.from('rate_limits').upsert(
        {
          ip_hash:         rateLimitKey,
          request_count:  windowExpired ? 1 : (rateData!.request_count + 1),
          window_start:    windowExpired ? now : rateData!.window_start,
          updated_at:      now,
        },
        { onConflict: 'ip_hash' }
      )
    }

    const response: UploadResponse = {
      document_id:   doc.id,
      document_type: documentType,
    }

    return res.status(200).json(response)
  } catch (err) {
    console.error('[upload] Unhandled error:', err)
    return res.status(500).json({ error: 'Upload failed. Please try again.' })
  }
}
