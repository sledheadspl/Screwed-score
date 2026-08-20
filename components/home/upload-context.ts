'use client'

import { createContext, useContext } from 'react'

export interface UploadContextValue {
  onUpload: (file: File) => void
  onSample: () => void
  isLoading: boolean
}

/**
 * Lets the upload control and the sample button — small client islands placed
 * inside the server-rendered landing page — reach the analysis state that lives
 * in `AnalysisShell`, without the page itself becoming a client component.
 */
export const UploadContext = createContext<UploadContextValue | null>(null)

export function useUploadContext(): UploadContextValue {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUploadContext must be used inside <AnalysisShell>')
  return ctx
}
