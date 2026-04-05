'use client'

import { useRef, useState, useCallback } from 'react'
import { Video, Download, Loader2, RefreshCw, Check } from 'lucide-react'

export interface VideoMeta {
  score: 'SCREWED' | 'MAYBE' | 'SAFE'
  score_percent: number
  flagged_amount: number
  flagged_items: Array<{ description: string; charged_amount: number | null; flag_reason?: string | null }>
  doc_label: string
}

interface Props {
  hook: string
  meta: VideoMeta
}

// ── Animation helpers ──────────────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function clamp(v: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, v))
}

function prog(elapsed: number, start: number, dur: number): number {
  return clamp((elapsed - start) / dur)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// ── Frame renderer ─────────────────────────────────────────────────────────

function drawFrame(ctx: CanvasRenderingContext2D, t: number, meta: VideoMeta, hook: string) {
  const W = 1080, H = 1920
  const { score, score_percent, flagged_amount, flagged_items, doc_label } = meta

  const scoreColor = score === 'SCREWED' ? '#ef4444' : score === 'MAYBE' ? '#f59e0b' : '#4ade80'
  const scoreEmoji = score === 'SCREWED' ? '🚨' : score === 'MAYBE' ? '⚠️' : '✅'
  const amountText = flagged_amount > 0
    ? `$${Math.round(flagged_amount).toLocaleString()} flagged`
    : `${score_percent}% screwed`

  // Background
  ctx.fillStyle = '#0d0d0f'
  ctx.fillRect(0, 0, W, H)

  // Top radial glow (fades in over 2s)
  const glowAlpha = clamp(t / 2) * 0.15
  if (glowAlpha > 0) {
    const grd = ctx.createRadialGradient(W / 2, 0, 0, W / 2, H * 0.1, H * 0.55)
    const hex = Math.round(glowAlpha * 255).toString(16).padStart(2, '0')
    grd.addColorStop(0, scoreColor + hex)
    grd.addColorStop(1, scoreColor + '00')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, W, H * 0.6)
  }

  // ── HOOK (0–4.5s) ──────────────────────────────────────────────────────
  if (t < 4.8) {
    const inP  = easeOutBack(prog(t, 0, 0.55))
    const outP = easeOutCubic(prog(t, 4.0, 0.5))
    const alpha = clamp(inP) * (1 - outP)
    const scale = 0.72 + easeOutBack(prog(t, 0, 0.55)) * 0.28

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(W / 2, H * 0.42)
    ctx.scale(scale, scale)
    ctx.font = `900 78px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const lines = wrapText(ctx, hook, W * 0.80)
    const lineH = 96
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * lineH)
    })
    ctx.restore()

    // "wait for it..."
    if (t > 1.6 && t < 4.5) {
      const wa = clamp((t - 1.6) / 0.4) * (1 - clamp((t - 4.0) / 0.4))
      ctx.save()
      ctx.globalAlpha = wa
      ctx.font = `600 40px system-ui, sans-serif`
      ctx.fillStyle = '#71717a'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('wait for it...', W / 2, H * 0.80)
      ctx.restore()
    }
  }

  // ── REVEAL (4.3s+) ─────────────────────────────────────────────────────
  if (t > 4.3) {
    const r = t - 4.3

    // Score badge
    {
      const p = easeOutBack(prog(r, 0, 0.5))
      const a = clamp(r / 0.3)
      ctx.save()
      ctx.globalAlpha = a
      ctx.translate(W / 2, H * 0.215)
      ctx.scale(0.55 + p * 0.45, 0.55 + p * 0.45)
      ctx.font = `900 66px system-ui, sans-serif`
      ctx.fillStyle = scoreColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${scoreEmoji} ${score}`, 0, 0)
      ctx.restore()
    }

    // Amount
    if (r > 0.65) {
      const p = easeOutBack(prog(r, 0.65, 0.5))
      const a = clamp((r - 0.65) / 0.3)
      ctx.save()
      ctx.globalAlpha = a
      ctx.translate(W / 2, H * 0.345)
      ctx.scale(0.65 + p * 0.35, 0.65 + p * 0.35)
      ctx.font = `900 108px system-ui, sans-serif`
      ctx.fillStyle = '#ef4444'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      // Wrap if too long
      const lines = wrapText(ctx, amountText, W * 0.85)
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * 118)
      })
      ctx.restore()
    }

    // Doc label
    if (r > 1.3) {
      const a = easeOutCubic(prog(r, 1.3, 0.4))
      ctx.save()
      ctx.globalAlpha = a
      ctx.font = `700 36px system-ui, sans-serif`
      ctx.fillStyle = '#71717a'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(doc_label.toUpperCase(), W / 2, H * 0.44)
      ctx.restore()
    }

    // Divider
    if (r > 1.9) {
      const wipe = easeOutCubic(prog(r, 1.9, 0.4))
      const a = clamp((r - 1.9) / 0.3)
      const dw = W * 0.60 * wipe
      ctx.save()
      ctx.globalAlpha = a
      ctx.fillStyle = '#27272a'
      ctx.fillRect(W / 2 - dw / 2, H * 0.484, dw, 2)
      ctx.restore()
    }

    // "What they got charged for"
    if (r > 2.2) {
      const a = easeOutCubic(prog(r, 2.2, 0.4))
      ctx.save()
      ctx.globalAlpha = a
      ctx.font = `700 30px system-ui, sans-serif`
      ctx.fillStyle = '#52525b'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('WHAT THEY GOT CHARGED FOR', W / 2, H * 0.514)
      ctx.restore()
    }
  }

  // ── FLAGGED ITEMS (8.5s+) ──────────────────────────────────────────────
  if (t > 8.5 && flagged_items.length > 0) {
    flagged_items.slice(0, 3).forEach((item, i) => {
      const itemStart = 8.5 + i * 1.8
      if (t < itemStart) return

      const slideP = easeOutCubic(prog(t, itemStart, 0.4))
      const alpha  = clamp((t - itemStart) / 0.3)
      const yBase  = H * (0.56 + i * 0.095)
      const xOff   = (1 - slideP) * 90

      ctx.save()
      ctx.globalAlpha = alpha

      // Description
      const desc = item.description.length > 34
        ? item.description.slice(0, 31) + '…'
        : item.description
      ctx.font = `700 42px system-ui, sans-serif`
      ctx.fillStyle = '#f4f4f5'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(desc, W * 0.09 + xOff, yBase)

      // Amount
      if (item.charged_amount != null) {
        ctx.font = `900 44px system-ui, sans-serif`
        ctx.fillStyle = '#ef4444'
        ctx.textAlign = 'right'
        ctx.fillText(`$${Math.round(item.charged_amount)}`, W * 0.91 + xOff, yBase)
      }

      // Flag reason
      if (item.flag_reason) {
        const reason = item.flag_reason.length > 44
          ? item.flag_reason.slice(0, 41) + '…'
          : item.flag_reason
        ctx.font = `500 30px system-ui, sans-serif`
        ctx.fillStyle = '#ef444488'
        ctx.textAlign = 'left'
        ctx.fillText(reason, W * 0.09 + xOff, yBase + 48)
      }

      ctx.restore()
    })
  }

  // ── CTA (21s+) ────────────────────────────────────────────────────────
  if (t > 21) {
    const ct = t - 21

    // Bottom gradient overlay
    const oa = easeOutCubic(prog(ct, 0, 0.6))
    const g2 = ctx.createLinearGradient(0, H * 0.62, 0, H)
    g2.addColorStop(0, 'rgba(13,13,15,0)')
    g2.addColorStop(0.25, `rgba(13,13,15,${oa})`)
    g2.addColorStop(1,    `rgba(13,13,15,${oa})`)
    ctx.fillStyle = g2
    ctx.fillRect(0, H * 0.62, W, H * 0.38)

    // "CHECK YOURS FREE"
    if (ct > 0.4) {
      const p = easeOutBack(prog(ct, 0.4, 0.55))
      const a = clamp((ct - 0.4) / 0.4)
      const yOff = (1 - p) * 70
      ctx.save()
      ctx.globalAlpha = a
      ctx.font = `900 84px system-ui, sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('CHECK YOURS FREE', W / 2, H * 0.78 + yOff)
      ctx.restore()
    }

    // URL
    if (ct > 1.0) {
      const a = easeOutCubic(prog(ct, 1.0, 0.4))
      ctx.save()
      ctx.globalAlpha = a
      ctx.font = `700 52px system-ui, sans-serif`
      ctx.fillStyle = '#ef4444'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('GetScrewedScore.com', W / 2, H * 0.875)
      ctx.restore()
    }
  }

  // Watermark (always)
  ctx.save()
  ctx.globalAlpha = 0.22
  ctx.font = `600 26px system-ui, sans-serif`
  ctx.fillStyle = '#71717a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText('GetScrewedScore.com', W / 2, H - 22)
  ctx.restore()
}

// ── Component ──────────────────────────────────────────────────────────────

const VIDEO_DURATION = 24 // seconds

export function VideoGenerator({ hook, meta }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'idle' | 'recording' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const rafRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [])

  const generate = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Check MediaRecorder support
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      setState('error')
      setErrorMsg('Your browser doesn\'t support canvas recording. Try Chrome or Edge.')
      return
    }

    canvas.width  = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')!

    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find(t => MediaRecorder.isTypeSupported(t)) ?? ''

    if (!mimeType) {
      setState('error')
      setErrorMsg('Video recording not supported in this browser. Try Chrome.')
      return
    }

    setState('recording')
    setProgress(0)

    const stream = canvas.captureStream(30)
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
    const chunks: Blob[] = []

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      setVideoUrl(URL.createObjectURL(blob))
      setState('done')
    }

    recorder.start(200)
    const startTime = performance.now()

    const tick = () => {
      const elapsed = (performance.now() - startTime) / 1000
      setProgress(Math.min(99, Math.round((elapsed / VIDEO_DURATION) * 100)))
      drawFrame(ctx, elapsed, meta, hook)

      if (elapsed < VIDEO_DURATION) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Draw final frame at exact end
        drawFrame(ctx, VIDEO_DURATION, meta, hook)
        setProgress(100)
        recorder.stop()
        stream.getTracks().forEach(t => t.stop())
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [hook, meta, stop])

  const reset = useCallback(() => {
    stop()
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(null)
    setState('idle')
    setProgress(0)
    setErrorMsg(null)
  }, [stop, videoUrl])

  return (
    <div className="rounded-xl border border-brand-border overflow-hidden">
      {/* Hidden canvas — renders the video */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="px-4 py-3 bg-brand-muted border-b border-brand-border flex items-center gap-2">
        <Video className="w-3.5 h-3.5 text-red-400" />
        <span className="text-xs font-bold text-brand-sub uppercase tracking-widest">Auto Video</span>
        <span className="ml-auto text-[10px] text-brand-sub/40">9:16 · WebM · Free</span>
      </div>

      <div className="p-4">
        {state === 'idle' && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-brand-sub leading-relaxed">
              Generate a ready-to-post portrait video — hook, score reveal, flagged charges, CTA. Renders in ~{VIDEO_DURATION}s.
            </p>
            <button onClick={generate}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
              <Video className="w-3.5 h-3.5" />
              Generate
            </button>
          </div>
        )}

        {state === 'recording' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-brand-sub">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                <span>Rendering…</span>
              </div>
              <span className="font-bold text-brand-text tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-brand-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #ff6b60, #ff3b30)',
                }} />
            </div>
            <p className="text-[10px] text-brand-sub/40 text-center">
              Rendering locally in your browser — no upload needed
            </p>
          </div>
        )}

        {state === 'done' && videoUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-green-400">
              <Check className="w-3.5 h-3.5" />
              Video ready!
            </div>
            <div className="flex gap-2">
              <a href={videoUrl} download="screwed-score-video.webm"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
                <Download className="w-4 h-4" />
                Download Video
              </a>
              <button onClick={reset}
                className="px-3 py-2.5 rounded-xl border border-brand-border text-brand-sub hover:text-brand-text transition-colors"
                title="Re-render">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-brand-sub/40">
              WebM format · Works on TikTok, Instagram Reels, YouTube Shorts
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-red-400">{errorMsg ?? 'Something went wrong.'}</p>
            <button onClick={reset}
              className="shrink-0 text-xs text-brand-sub hover:text-brand-text transition-colors">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
