/**
 * Keeps uploads under the hosting limit.
 *
 * /api/upload runs as a Netlify Function, and Netlify refuses request bodies
 * over about 6 MB before the function ever runs. A phone camera photo is often
 * 3–10 MB, so those uploads died in the browser with no server log at all.
 *
 * Photos are shrunk in the browser (longest side 2400 px, JPEG) before they are
 * sent, which keeps them well under the limit and still sharp enough to read.
 * Everything else must already be under UPLOAD_MAX_BYTES.
 */

/** Largest body we send to /api/upload. Leaves headroom under Netlify's ~6 MB. */
export const UPLOAD_MAX_BYTES = 4.5 * 1024 * 1024
/** Largest photo we accept before shrinking it. */
export const PHOTO_MAX_BYTES = 25 * 1024 * 1024

const MAX_SIDE = 2400
const SHRINKABLE = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function isShrinkableImage(file: File): boolean {
  return SHRINKABLE.has(file.type)
}

/**
 * Returns a file that is safe to send. Photos are shrunk when they are large;
 * if shrinking fails the original is returned and the size check decides.
 */
export async function prepareUpload(file: File): Promise<File> {
  if (!isShrinkableImage(file)) return file
  if (file.size <= 1.5 * 1024 * 1024) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#ffffff' // PNGs with transparency would otherwise go black
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}
