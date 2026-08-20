'use client'

import { UploadZone } from '@/components/UploadZone'
import { useUploadContext } from './upload-context'

/**
 * Thin client wrapper so the server-rendered landing page can drop an upload
 * control into the hero and the bottom CTA without becoming a client component
 * itself.
 */
export function UploadSlot({ idPrefix }: { idPrefix: string }) {
  const { onUpload } = useUploadContext()
  return <UploadZone onUpload={onUpload} isLoading={false} idPrefix={idPrefix} />
}

/** "See a live example first" — loads the sample payload on demand. */
export function SampleButton() {
  const { onSample } = useUploadContext()
  return (
    <button
      onClick={onSample}
      className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 hover:border-brand-border sample-cta"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(240,244,255,0.55)',
      }}
    >
      See a live example first →
    </button>
  )
}
