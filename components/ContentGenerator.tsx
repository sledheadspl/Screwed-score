'use client'

import { useState, useRef, useCallback } from 'react'
import { Sparkles, Copy, Check, Loader2, ChevronDown, ChevronUp, Zap, Video, Download, RefreshCw } from 'lucide-react'

interface GeneratedContent {
  hook: string
  script: string
  caption: string
  hashtags: string[]
  on_screen_text: string[]
}

type VideoStatus = 'idle' | 'rendering' | 'succeeded' | 'failed'

interface Props {
  analysisId: string
  isPro: boolean
  onUpgrade: () => void
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1 text-xs text-brand-sub hover:text-brand-text transition-colors px-2 py-1 rounded-md hover:bg-brand-muted">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function ContentGenerator({ analysisId, isPro, onUpgrade }: Props) {
  const [content, setContent] = useState<GeneratedContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scriptOpen, setScriptOpen] = useState(false)

  // Video state
  const [videoStatus, setVideoStatus] = useState<VideoStatus>('idle')
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const pollStatus = useCallback((renderId: string) => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/video-status/${renderId}`)
        if (!res.ok) { stopPolling(); setVideoStatus('failed'); return }
        const data = await res.json()
        setVideoProgress(Math.round((data.progress ?? 0) * 100))
        if (data.status === 'succeeded') {
          stopPolling()
          setVideoStatus('succeeded')
          setVideoUrl(data.url)
        } else if (data.status === 'failed') {
          stopPolling()
          setVideoStatus('failed')
          setVideoError(data.error_message ?? 'Render failed')
        }
      } catch {
        stopPolling()
        setVideoStatus('failed')
      }
    }, 3000)
  }, [stopPolling])

  const generate = async () => {
    if (!isPro) { onUpgrade(); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: analysisId }),
      })
      const data = await res.json()
      if (!res.ok) { setError('Generation failed. Try again.'); return }
      setContent(data)
      // Reset video state on new content
      setVideoStatus('idle')
      setVideoUrl(null)
      setVideoError(null)
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const generateVideo = async () => {
    if (!content) return
    setVideoStatus('rendering')
    setVideoProgress(0)
    setVideoError(null)
    setVideoUrl(null)

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysisId,
          hook: content.hook,
          on_screen_text: content.on_screen_text,
          caption: content.caption,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setVideoStatus('failed')
        setVideoError('Video generation failed. Try again.')
        return
      }
      pollStatus(data.render_id)
    } catch {
      setVideoStatus('failed')
      setVideoError('Something went wrong.')
    }
  }

  if (content) {
    return (
      <div className="rounded-2xl border border-brand-border bg-brand-surface overflow-hidden"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        <div className="px-5 py-3 border-b border-brand-border flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-semibold text-brand-sub uppercase tracking-widest">Viral Script</span>
          <button onClick={() => setContent(null)}
            className="ml-auto text-xs text-brand-sub hover:text-brand-text transition-colors">
            Regenerate
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Hook */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Hook (first 3 sec)</p>
              <CopyButton text={content.hook} />
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-sm font-bold text-brand-text">&ldquo;{content.hook}&rdquo;</p>
            </div>
          </div>

          {/* On-screen text */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-brand-sub uppercase tracking-widest">On-Screen Text Overlays</p>
            <div className="flex flex-wrap gap-2">
              {content.on_screen_text.map((t, i) => (
                <span key={i} className="px-3 py-1 rounded-lg border border-brand-border bg-brand-muted text-xs font-bold text-brand-text">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Script (collapsible) */}
          <div className="space-y-2">
            <button onClick={() => setScriptOpen(o => !o)}
              className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-brand-sub uppercase tracking-widest">Full Script</p>
                <CopyButton text={content.script} />
              </div>
              {scriptOpen ? <ChevronUp className="w-3.5 h-3.5 text-brand-sub" /> : <ChevronDown className="w-3.5 h-3.5 text-brand-sub" />}
            </button>
            {scriptOpen && (
              <div className="rounded-xl border border-brand-border bg-brand-muted p-4">
                <p className="text-sm text-brand-text/80 leading-relaxed whitespace-pre-wrap">{content.script}</p>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-brand-sub uppercase tracking-widest">Caption</p>
              <CopyButton text={content.caption} />
            </div>
            <div className="rounded-xl border border-brand-border bg-brand-muted p-3">
              <p className="text-sm text-brand-text/80 leading-relaxed">{content.caption}</p>
            </div>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-brand-sub uppercase tracking-widest">Hashtags</p>
              <CopyButton text={content.hashtags.map(h => `#${h}`).join(' ')} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {content.hashtags.map((h, i) => (
                <span key={i} className="text-xs text-red-400 font-medium">#{h}</span>
              ))}
            </div>
          </div>

          {/* ── Video Generator ── */}
          <div className="rounded-xl border border-brand-border overflow-hidden">
            <div className="px-4 py-3 bg-brand-muted border-b border-brand-border flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-bold text-brand-sub uppercase tracking-widest">Auto Video</span>
              <span className="ml-auto text-[10px] text-brand-sub/50">powered by Creatomate</span>
            </div>

            <div className="p-4">
              {videoStatus === 'idle' && (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-brand-sub">
                    Generate a ready-to-post 9:16 MP4 — hook, reveal, flagged charges, CTA. ~30 seconds to render.
                  </p>
                  <button onClick={generateVideo}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
                    <Video className="w-3.5 h-3.5" />
                    Generate
                  </button>
                </div>
              )}

              {videoStatus === 'rendering' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-brand-sub">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                      <span>Rendering your video…</span>
                    </div>
                    <span className="font-bold text-brand-text">{videoProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-brand-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${videoProgress}%`,
                        background: 'linear-gradient(90deg, #ff6b60, #ff3b30)',
                      }} />
                  </div>
                  <p className="text-[10px] text-brand-sub/50 text-center">Usually takes 20–40 seconds</p>
                </div>
              )}

              {videoStatus === 'succeeded' && videoUrl && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-green-400 font-bold">
                    <Check className="w-3.5 h-3.5" />
                    Video ready!
                  </div>
                  <div className="flex gap-2">
                    <a href={videoUrl} download target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
                      <Download className="w-4 h-4" />
                      Download MP4
                    </a>
                    <button onClick={() => { setVideoStatus('idle'); setVideoUrl(null) }}
                      className="px-3 py-2.5 rounded-xl border border-brand-border text-xs text-brand-sub hover:text-brand-text transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-brand-sub/50">9:16 portrait · MP4 · Ready for TikTok, Reels, Shorts</p>
                </div>
              )}

              {videoStatus === 'failed' && (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-red-400">{videoError ?? 'Render failed. Try again.'}</p>
                  <button onClick={() => setVideoStatus('idle')}
                    className="shrink-0 text-xs text-brand-sub hover:text-brand-text transition-colors">
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-5"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-400" />
            <p className="text-sm font-bold text-brand-text">Turn this into a viral video</p>
            {!isPro && (
              <span className="text-[10px] font-bold text-red-400 border border-red-500/30 rounded px-1.5 py-0.5 uppercase tracking-wide">Pro</span>
            )}
          </div>
          <p className="text-xs text-brand-sub">
            Get a ready-to-post TikTok/Reel script, caption, hashtags, and auto-generated MP4 video.
          </p>
        </div>
        <button onClick={generate} disabled={loading}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #ff6b60, #ff3b30)' }}>
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
          ) : !isPro ? (
            <><Zap className="w-3.5 h-3.5" /> Unlock</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Generate</>
          )}
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  )
}
