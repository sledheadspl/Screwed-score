'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2, Camera, FolderOpen } from 'lucide-react'
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
  const [dragActive, setDragActive]   = useState(false)
  const [isMobile, setIsMobile]       = useState(false)
  const cameraInputRef                = useRef<HTMLInputElement>(null)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMobile(
      navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    )
  }, [])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setDragActive(false)
      if (acceptedFiles[0]) onUpload(acceptedFiles[0])
    },
    [onUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: isLoading || isMobile,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  })

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ''
  }

  // ── Loading state (same for both) ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-brand-border bg-brand-surface p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-2xl bg-brand-muted flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-sub animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-xl font-bold text-brand-sub">Analyzing your document...</p>
          <p className="text-sm text-brand-sub/60">Hang tight — this takes about 20–30 seconds</p>
        </div>
      </div>
    )
  }

  // ── Mobile UI ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp,.txt,image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Primary: Camera */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full rounded-2xl p-8 flex flex-col items-center gap-4 text-center border-2 transition-all active:scale-[0.98]"
          style={{
            borderColor: 'rgba(255,59,48,0.4)',
            background: 'linear-gradient(135deg, rgba(255,59,48,0.08) 0%, rgba(13,13,15,0.95) 100%)',
            boxShadow: '0 0 40px rgba(255,59,48,0.1)',
          }}
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)' }}>
            <Camera className="w-9 h-9 text-red-400" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-black text-brand-text">Photograph your bill</p>
            <p className="text-sm text-brand-sub">Point your camera at any bill, invoice, or contract</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-400/80">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Free · No account · Results in ~20 seconds
          </div>
        </button>

        {/* Secondary: File picker */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-xl border border-brand-border bg-brand-surface px-5 py-3.5 flex items-center gap-3 text-left transition-all active:scale-[0.99] hover:bg-brand-muted/40"
        >
          <FolderOpen className="w-5 h-5 text-brand-sub shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-text">Choose from files</p>
            <p className="text-xs text-brand-sub truncate">PDF, DOCX, JPG, PNG — up to 10 MB</p>
          </div>
        </button>

        {/* Scrolling ticker */}
        <div className="overflow-hidden py-1.5 opacity-50">
          <div className="ticker-track gap-6">
            {[...DOC_TYPES, ...DOC_TYPES].map((type, i) => (
              <span key={i} className="text-[11px] text-brand-sub font-medium shrink-0 px-3">
                · {type}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Desktop UI (unchanged) ────────────────────────────────────────────────────
  const isActive = isDragActive || dragActive

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative group rounded-2xl transition-all duration-300 cursor-pointer select-none overflow-hidden',
        isActive ? 'scale-[1.01]' : ''
      )}
    >
      <input {...getInputProps()} />

      {isActive && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-red-500/60 pointer-events-none z-10"
          style={{ boxShadow: '0 0 40px rgba(255,59,48,0.3), inset 0 0 40px rgba(255,59,48,0.05)' }} />
      )}

      <div className={cn(
        'relative border-2 border-dashed rounded-2xl p-10 sm:p-14 flex flex-col items-center gap-6 text-center transition-all duration-300',
        isActive
          ? 'border-red-500/70 bg-red-500/5'
          : 'border-brand-border bg-brand-surface hover:border-brand-muted/60 hover:bg-brand-surface2'
      )}>
        <div className="absolute inset-0 pointer-events-none rounded-2xl opacity-30"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />

        <div className={cn(
          'relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300',
          isActive ? 'bg-red-500/20' : 'bg-brand-muted group-hover:bg-brand-muted/80'
        )}>
          {isActive ? (
            <Upload className="w-8 h-8 text-red-400 animate-bounce" />
          ) : (
            <Upload className="w-8 h-8 text-brand-sub group-hover:text-brand-text transition-colors" />
          )}
        </div>

        <div className="space-y-2">
          <p className={cn(
            'text-xl font-bold transition-colors',
            isActive ? 'text-red-400' : 'text-brand-text'
          )}>
            {isActive ? "Drop it. Let's find out." : 'Drop your document here'}
          </p>
          <p className="text-sm text-brand-sub">
            PDF, DOCX, JPG, PNG · Bills, invoices, leases, contracts
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {['PDF', 'DOCX', 'JPG', 'PNG'].map(fmt => (
            <span key={fmt} className="px-2.5 py-1 rounded-lg bg-brand-muted border border-brand-border text-[11px] font-medium text-brand-sub">
              {fmt}
            </span>
          ))}
        </div>

        {!isActive && (
          <div className="flex items-center gap-2 text-xs text-brand-sub/60">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Free · No account required · Results in ~20 seconds
          </div>
        )}
      </div>

      <div className="overflow-hidden mt-3 py-1.5 opacity-50">
        <div className="ticker-track gap-6">
          {[...DOC_TYPES, ...DOC_TYPES].map((type, i) => (
            <span key={i} className="text-[11px] text-brand-sub font-medium shrink-0 px-3">
              · {type}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
