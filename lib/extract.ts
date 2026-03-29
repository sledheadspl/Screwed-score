/**
 * Text extraction from uploaded files.
 * Server-side only — never import from client components.
 */

// Magic byte signatures for MIME validation (first 8 bytes)
const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },          // %PDF
  { mime: 'application/zip', bytes: [0x50, 0x4b, 0x03, 0x04] },          // PK (DOCX is ZIP)
  { mime: 'image/jpeg',      bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png',       bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp',      bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
]

/**
 * Validates that the buffer's magic bytes loosely match the claimed MIME type.
 * Not a full security guarantee — just a basic sanity check against spoofing.
 */
function validateMagicBytes(buffer: Buffer, claimedMime: string): boolean {
  // Plain text has no magic bytes — allow it
  if (claimedMime === 'text/plain') return true

  // DOCX is a ZIP file
  const effectiveMime =
    claimedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    claimedMime === 'application/msword'
      ? 'application/zip'
      : claimedMime

  const rule = MAGIC_BYTES.find(r => r.mime === effectiveMime)
  if (!rule) return true // Unknown type — pass through, let parser reject it

  const offset = rule.offset ?? 0
  return rule.bytes.every((byte, i) => buffer[offset + i] === byte)
}

export function checkMagicBytes(buffer: Buffer, claimedMime: string): void {
  if (!validateMagicBytes(buffer, claimedMime)) {
    throw new Error('File content does not match the declared file type')
  }
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPdf(buffer)
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }

  if (mimeType.startsWith('text/')) {
    return buffer.toString('utf-8').trim()
  }

  if (mimeType.startsWith('image/')) {
    return extractTextFromImage(buffer, mimeType)
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000 })
  const base64 = buffer.toString('base64')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client.messages.create as any)({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: 'Extract ALL text from this document exactly as it appears. Include all line items, prices, dates, names, and terms. Output only the extracted text, no commentary.',
          },
        ],
      },
    ],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') throw new Error('PDF extraction returned no text')
  return block.text.trim()
}

async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 30_000,
  })

  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
  type ValidImageType = (typeof validImageTypes)[number]

  if (!(validImageTypes as readonly string[]).includes(mimeType)) {
    throw new Error(`Unsupported image MIME type for vision: ${mimeType}`)
  }

  const mediaType = mimeType as ValidImageType
  const base64 = buffer.toString('base64')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: 'Extract ALL text from this document image exactly as it appears. Include all line items, prices, dates, names, and terms. Output only the extracted text, no commentary.',
          },
        ],
      },
    ],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') {
    throw new Error('Vision API returned no text content')
  }
  return block.text
}
