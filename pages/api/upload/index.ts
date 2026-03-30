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

/** Anonymous users: 3 analyses per IP per 30 days. Pro users: unlimited. */
const ANON_LIMIT = 3
const WINDOW_MS  = 30 * 24 * 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const supabase = createServiceClient()

    // ── 1. Pro token check — bypass rate limit for paying customers ─────────
    const proToken = req.cookies['gss_pro']
    const isPro = proToken ? verifyToken(proToken) : false

    // ── 2. Rate limiting (skipped for Pro) ──────────────────────────────────
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? '0.0.0.0'
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
        const windowAge    = Date.now() - new Date(rateData.window_start).getTime()
        const windowActive = windowAge < WINDOW_MS
        if (windowActive && rateData.analyses_count >= ANON_LIMIT) {
          return res.status(429).json({ error: 'LIMIT_REACHED' })
        }
        if (!windowActive) rateData = null
      }
    }

    // ── 3. Parse multipart form data with formidable ─────────────────────────
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
      })
      .select('id')
      .single()

    if (docError || !doc) {
      throw new Error(`Failed to persist document: ${docError?.message ?? 'unknown error'}`)
    }

    // ── 9. Atomic rate limit increment (skipped for Pro) ────────────────────
    if (!isPro) {
      const now           = new Date().toISOString()
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
