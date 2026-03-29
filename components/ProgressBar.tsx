'use client'

import { cn } from '@/lib/utils'
import type { AppPhase } from '@/lib/types'

interface ProgressBarProps {
  phase: AppPhase
  progress: number
  label: string
}

const STEPS = [
  { phase: 'uploading' as AppPhase, label: 'Uploading' },
  { phase: 'parsing' as AppPhase,   label: 'Reading' },
  { phase: 'analyzing' as AppPhase, label: 'Analyzing' },
  { phase: 'done' as AppPhase,      label: 'Done' },
]

const MESSAGES: Partial<Record<AppPhase, string[]>> = {
  uploading: ['Sending your file...'],
  parsing:   ['Reading the document...', 'Extracting text...'],
  analyzing: [
    'Running it through the AI...',
    'Checking for suspicious charges...',
    'Computing your Screwed Score...',
    'Almost there...',
  ],
}

export function ProgressBar({ phase, progress, label }: ProgressBarProps) {
  if (phase === 'idle' || phase === 'error') return null

  const currentIdx = STEPS.findIndex(s => s.phase === phase)

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-5 animate-fade-in"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>

      {/* Animated logo / icon */}
      <div className="flex justify-center">
        <div className="relative w-12 h-12">
          {/* Spinning ring */}
          <svg className="w-full h-full animate-spin" style={{ animationDuration: '2s' }} viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#1c1c1c" strokeWidth="3" />
            <circle
              cx="24" cy="24" r="20"
              fill="none"
              stroke="url(#spinGrad)"
              strokeWidth="3"
              strokeDasharray="30 96"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff3b30" />
                <stop offset="100%" stopColor="#ff3b30" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Status message */}
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-brand-text">{label}</p>
        <p className="text-xs text-brand-sub">This usually takes 15–30 seconds</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-1.5 w-full bg-brand-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-brand-sub/50">
          <span>{progress}%</span>
          <span>Powered by ContractGuard + AI</span>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const done = i < currentIdx
          const active = i === currentIdx
          return (
            <div key={step.phase} className="flex items-center gap-0">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  'w-2 h-2 rounded-full transition-all duration-500',
                  done ? 'bg-green-500' :
                  active ? 'bg-red-400 animate-pulse' :
                  'bg-brand-muted'
                )} />
                <span className={cn(
                  'text-[9px] font-medium transition-colors',
                  done ? 'text-green-400' :
                  active ? 'text-red-400' :
                  'text-brand-sub/40'
                )}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'h-px w-12 sm:w-16 mx-2 mb-3 transition-all duration-500',
                  done ? 'bg-green-500/40' : 'bg-brand-muted'
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
