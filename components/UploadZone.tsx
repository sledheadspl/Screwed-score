'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onUpload: (file: File) => void
  isLoading: boolean
}

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'text/plain': ['.txt'],
}

const DOC_TYPES = ['Mechanic Invoice', 'Medical Bill', 'Lease Agreement', 'Contractor Estimate', 'Brand Deal', 'Phone Bill', 'Insurance Quote']

export function UploadZone({ onUpload, isLoading }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setDragActive(false)
      if (acceptedFiles[0]) onUpload(acceptedFiles[0])
    },
    [onUpload]
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: isLoading,
    noClick: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  })

  const isActive = isDragActive || dragActive

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative group rounded-2xl transition-all duration-300 cursor-pointer select-none overflow-hidden',
        isLoading && 'cursor-not-allowed pointer-events-none',
        isActive ? 'scale-[1.01]' : ''
      )}
    >
      <input {...getInputProps()} />

      {/* Outer glow when dragging */}
      {isActive && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-red-500/60 pointer-events-none z-10"
          style={{ boxShadow: '0 0 40px rgba(255,59,48,0.3), inset 0 0 40px rgba(255,59,48,0.05)' }} />
      )}

      {/* Main container */}
      <div className={cn(
        'relative border-2 border-dashed rounded-2xl p-10 sm:p-14 flex flex-col items-center gap-6 text-center transition-all duration-300',
        isLoading
          ? 'border-brand-border bg-brand-surface'
          : isActive
          ? 'border-red-500/70 bg-red-500/5'
          : 'border-brand-border bg-brand-surface hover:border-brand-muted/60 hover:bg-brand-surface2'
      )}>

        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl opacity-30"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />

        {/* Icon */}
        <div className={cn(
          'relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300',
          isLoading ? 'bg-brand-muted' :
          isActive ? 'bg-red-500/20' : 'bg-brand-muted group-hover:bg-brand-muted/80'
        )}>
          {isLoading ? (
            <Loader2 className="w-8 h-8 text-brand-sub animate-spin" />
          ) : isActive ? (
            <Upload className="w-8 h-8 text-red-400 animate-bounce" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-brand-sub group-hover:text-brand-text transition-colors" />
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </div>

        {/* Text */}
        <div className="space-y-2">
          <p className={cn(
            'text-xl font-bold transition-colors',
            isLoading ? 'text-brand-sub' :
            isActive ? 'text-red-400' : 'text-brand-text'
          )}>
            {isLoading
              ? 'Analyzing your document...'
              : isActive
              ? 'Drop it. Let\'s find out.'
              : 'Drop your document here'}
          </p>
          <p className="text-sm text-brand-sub">
            {isLoading
              ? 'Hang tight — this takes about 20–30 seconds'
              : 'PDF, DOCX, JPG, PNG · Bills, invoices, leases, contracts'}
          </p>
        </div>

        {/* Format pills */}
        {!isLoading && (
          <div className="flex flex-wrap justify-center gap-2">
            {['PDF', 'DOCX', 'JPG', 'PNG'].map(fmt => (
              <span key={fmt} className="px-2.5 py-1 rounded-lg bg-brand-muted border border-brand-border text-[11px] font-medium text-brand-sub">
                {fmt}
              </span>
            ))}
          </div>
        )}

        {/* Free badge */}
        {!isLoading && !isActive && (
          <div className="flex items-center gap-2 text-xs text-brand-sub/60">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Free · No account required · Results in ~20 seconds
          </div>
        )}
      </div>

      {/* Scrolling doc type ticker */}
      {!isLoading && (
        <div className="overflow-hidden mt-3 py-1.5 opacity-50">
          <div className="ticker-track gap-6">
            {[...DOC_TYPES, ...DOC_TYPES].map((type, i) => (
              <span key={i} className="text-[11px] text-brand-sub font-medium shrink-0 px-3">
                · {type}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
