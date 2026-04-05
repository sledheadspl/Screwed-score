import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ScrewedScore } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getScoreEmoji(score: ScrewedScore): string {
  if (score === 'SCREWED') return '🚨'
  if (score === 'MAYBE') return '⚠️'
  return '✅'
}

export function formatDollar(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Returns true if the string is a valid UUID v4 format. */
export function isValidUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

/**
 * Robustly extracts the first complete JSON object from an AI response.
 * Handles markdown code fences, preamble text, and nested structures.
 */
export function extractJSON(text: string): unknown {
  // Strip markdown code fences
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '')

  // Find the first { and walk to its matching }
  const start = stripped.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) {
        return JSON.parse(stripped.slice(start, i + 1))
      }
    }
  }

  throw new Error('Malformed JSON: unmatched braces')
}
