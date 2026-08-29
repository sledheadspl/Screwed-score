'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { AlertCircle, RotateCcw } from 'lucide-react'
import type { AppState, AnalysisResult, UploadResponse, AnalyzeResponse } from '@/lib/types'
import { getBrowserSupabase, hasProCookie } from '@/lib/supabase-browser'
import { UploadContext } from './upload-context'

// Everything past the landing page is fetched on demand. The result view in
// particular drags in ~15 cards; keeping it out of the initial chunk is most of
// the reason the hero can paint and be usable quickly.
const ResultView      = dynamic(() => import('./ResultView').then(m => m.ResultView),                          { ssr: false })
const ProgressBar     = dynamic(() => import('@/components/ProgressBar').then(m => m.ProgressBar),             { ssr: false })
const UploadZone      = dynamic(() => import('@/components/UploadZone').then(m => m.UploadZone),               { ssr: false })
const PaywallModal    = dynamic(() => import('@/components/PaywallModal').then(m => m.PaywallModal),           { ssr: false })
const ExitIntentPopup = dynamic(() => import('@/components/ExitIntentPopup').then(m => m.ExitIntentPopup),     { ssr: false })

const INITIAL_STATE: AppState = {
  phase: 'idle', progress: 0, progressLabel: '',
  analysisId: null, result: null, error: null, documentType: null,
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Owns the upload → analyse → result state machine for the homepage.
 *
 * `children` is the server-rendered landing page, passed in as an already-
 * rendered node. It is rendered while the shell is idle and swapped out for the
 * progress / error / result views afterwards — the same behaviour the old
 * client-side page had, except the marketing markup now costs zero client JS.
 */
export function AnalysisShell({ children }: { children: React.ReactNode }) {
  const [state, setState]               = useState<AppState>(INITIAL_STATE)
  const [showPaywall, setShowPaywall]   = useState(false)
  const [, setLimitReached]             = useState(false)
  const [isSample, setIsSample]         = useState(false)
  const [isPro, setIsPro]               = useState(false)
  const [userEmail, setUserEmail]       = useState<string | null>(null)
  const [refToken, setRefToken]         = useState<string | null>(null)
  const [refBanner, setRefBanner]       = useState(false)
  const [authError, setAuthError]       = useState(false)
  const [mountExtras, setMountExtras]   = useState(false)

  // Post-paint work only: cookie read, query-string handling, then the Supabase
  // SDK loaded lazily. None of this blocks the hero.
  useEffect(() => {
    setIsPro(hasProCookie())

    const params = new URLSearchParams(window.location.search)
    if (params.get('auth_error') === '1') {
      setAuthError(true)
      window.history.replaceState({}, '', window.location.pathname)
    }

    const ref = params.get('ref')
    if (ref) {
      fetch(`/api/referral?token=${encodeURIComponent(ref)}`)
        .then(r => r.json())
        .then(data => {
          if (data.valid) {
            setRefToken(ref)
            setRefBanner(true)
            window.history.replaceState({}, '', '/')
          }
        })
        .catch(() => {})
    }

    let unsubscribe: (() => void) | undefined
    let cancelled = false

    const idle = () => {
      if (cancelled) return
      setMountExtras(true)
      getBrowserSupabase().then(client => {
        if (cancelled) return
        client.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
        const { data: { subscription } } = client.auth.onAuthStateChange((_e, session) => {
          setUserEmail(session?.user?.email ?? null)
          setIsPro(hasProCookie())
        })
        unsubscribe = () => subscription.unsubscribe()
      })
    }

    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    const handle = w.requestIdleCallback
      ? w.requestIdleCallback(idle, { timeout: 3000 })
      : window.setTimeout(idle, 1500)

    return () => {
      cancelled = true
      unsubscribe?.()
      if (!w.requestIdleCallback) window.clearTimeout(handle)
    }
  }, [])


  const setPhase = (phase: AppState['phase'], progress: number, label: string) =>
    setState(s => ({ ...s, phase, progress, progressLabel: label }))

  const handleUpload = useCallback(async (file: File) => {
    setState({ ...INITIAL_STATE, phase: 'uploading', progress: 10, progressLabel: 'Uploading file...' })
    try {
      const form = new FormData()
      form.append('file', file)
      setPhase('uploading', 25, 'Uploading file...')

      const client = await getBrowserSupabase()
      const { data: sessionData } = await client.auth.getSession()
      const authToken = sessionData?.session?.access_token
      const uploadHeaders: Record<string, string> = {}
      if (authToken) uploadHeaders['x-supabase-token'] = authToken
      if (refToken)  uploadHeaders['x-ref-token'] = refToken

      const uploadRes  = await fetch('/api/upload', { method: 'POST', body: form, headers: uploadHeaders })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        if (uploadRes.status === 429 || uploadData.error === 'LIMIT_REACHED') {
          setState(INITIAL_STATE)
          setShowPaywall(true)
          return
        }
        setState(s => ({ ...s, phase: 'error', error: uploadData.error ?? 'Upload failed' }))
        return
      }

      const { document_id, document_type, limit_reached } = uploadData as UploadResponse
      if (limit_reached) setLimitReached(true)
      if (refToken) { setRefToken(null); setRefBanner(false) }
      setPhase('parsing', 45, 'Reading your document...')
      await delay(400)
      setPhase('analyzing', 65, 'Running AI analysis...')

      const analyzeRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ document_id }),
        }
      )
      setPhase('analyzing', 88, 'Computing your Screwed Score...')

      const analyzeText = await analyzeRes.text()
      let analyzeData: { error?: string; analysis_id?: string; result?: AnalyzeResponse['result'] } = {}
      try { analyzeData = JSON.parse(analyzeText) } catch { /* non-JSON response */ }
      if (!analyzeRes.ok) {
        setState(s => ({ ...s, phase: 'error', error: analyzeData.error ?? 'Analysis timed out — please try again.' }))
        return
      }

      const { analysis_id, result } = analyzeData as unknown as AnalyzeResponse
      ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.(
        'event', 'scan_complete',
        { score: result.screwed_score, document_type, screwed_score_percent: result.screwed_score_percent }
      )
      setState(s => ({
        ...s, phase: 'done', progress: 100, progressLabel: 'Done',
        analysisId: analysis_id, documentType: document_type,
        result: { ...result, created_at: new Date().toISOString() },
      }))
    } catch (err) {
      setState(s => ({
        ...s, phase: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      }))
    }
  }, [refToken])

  const handleReset = useCallback(() => {
    setState(INITIAL_STATE); setLimitReached(false); setIsSample(false)
  }, [])

  const handleSample = useCallback(async () => {
    const { SAMPLE_RESULT } = await import('@/lib/sample-result')
    setIsSample(true)
    setLimitReached(false)
    setState({
      ...INITIAL_STATE, phase: 'done', progress: 100, progressLabel: 'Done',
      analysisId: 'sample', documentType: 'mechanic_invoice',
      result: SAMPLE_RESULT as AnalysisResult,
    })
  }, [])

  const isLoading = state.phase === 'uploading' || state.phase === 'parsing' || state.phase === 'analyzing'

  const ctx = useMemo(
    () => ({ onUpload: handleUpload, onSample: handleSample, isLoading }),
    [handleUpload, handleSample, isLoading]
  )

  return (
    <UploadContext.Provider value={ctx}>

      {state.phase === 'idle' && mountExtras && <ExitIntentPopup />}

      {showPaywall && (
        <PaywallModal onClose={() => setShowPaywall(false)} />
      )}

      {authError && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-4 px-4 py-3 bg-red-950/90 border-b border-red-500/30 text-sm text-red-300 backdrop-blur-sm">
          <span>Sign-in failed — please try again.</span>
          <button onClick={() => setAuthError(false)} className="text-red-400 hover:text-red-200 transition-colors text-xs font-bold">Dismiss</button>
        </div>
      )}

      {state.phase === 'idle' && refBanner && (
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-sm">
            <span className="text-lg">🎁</span>
            <div>
              <span className="font-bold text-purple-300">A friend gave you a free scan!</span>
              <span className="text-brand-sub ml-2">Upload any bill or contract below — no paywall.</span>
            </div>
          </div>
        </div>
      )}

      {/* Idle: the server-rendered landing page. */}
      {state.phase === 'idle' && children}

      {isLoading && (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
          <UploadZone onUpload={handleUpload} isLoading idPrefix="uz-loading" />
          <ProgressBar phase={state.phase} progress={state.progress} label={state.progressLabel} />
        </div>
      )}

      {state.phase === 'error' && (
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="rounded-2xl border border-red-500/25 bg-red-950/15 p-6 space-y-4 animate-fade-up"
            style={{ boxShadow: '0 0 40px rgba(255,59,48,0.1)' }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">Analysis failed</p>
                <p className="text-sm text-brand-sub mt-1">{state.error}</p>
              </div>
            </div>
            <button onClick={handleReset}
              className="flex items-center gap-2 text-sm text-brand-sub hover:text-brand-text transition-colors">
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        </div>
      )}

      {state.phase === 'done' && state.result && state.analysisId && (
        <ResultView
          result={state.result}
          analysisId={state.analysisId}
          documentType={state.documentType}
          isSample={isSample}
          isPro={isPro}
          userEmail={userEmail}
          onReset={handleReset}
          onUpgrade={() => setShowPaywall(true)}
        />
      )}

      {isSample && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4"
          style={{ background: 'linear-gradient(to top, rgba(2,3,8,0.98) 60%, transparent)' }}>
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleReset}
              className="w-full py-4 rounded-2xl font-black text-base tracking-tight transition-all duration-200 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #ff6b60, #ff3b30)',
                boxShadow: '0 0 40px rgba(255,59,48,0.35)',
                color: '#fff',
              }}
            >
              Scan my own bill — it&apos;s free →
            </button>
            <p className="text-center text-[11px] mt-2" style={{ color: 'rgba(107,122,153,0.5)' }}>
              No account · No credit card · Files deleted after scan
            </p>
          </div>
        </div>
      )}
    </UploadContext.Provider>
  )
}

export default AnalysisShell
