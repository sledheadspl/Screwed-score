'use client'

import { track } from '@/lib/track'
import { useState, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { AlertCircle, RotateCcw } from 'lucide-react'
import type { AppState, AnalysisResult, UploadResponse, AnalyzeResponse } from '@/lib/types'
import { getBrowserSupabase, hasProCookie } from '@/lib/supabase-browser'
import { UploadContext } from './upload-context'
import { prepareUpload, UPLOAD_MAX_BYTES } from '@/lib/prepare-upload'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase-public'

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

// A real bill takes about a minute to analyze. iPhone Safari often drops a
// request that long (screen locks, the person switches apps, a call comes in),
// even though the analysis still finishes and is saved. So the page never
// relies on that one request: it starts looking the saved result up by
// document id early, and again whenever the request fails or the page is
// reopened.
const RECOVER_AFTER_MS   = 20_000
const RECOVER_WINDOW_MS  = 180_000
const RECOVER_POLL_MS    = 4_000

// The scan in flight, kept per tab so a page Safari reloaded or restored can
// pick the result up instead of starting over.
const PENDING_KEY        = 'gss_pending_scan'
const PENDING_MAX_AGE_MS = 10 * 60_000
type PendingScan = { documentId: string; startedAt: number }

function savePending(p: PendingScan) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(p)) } catch { /* storage blocked */ }
}
function clearPending() {
  try { sessionStorage.removeItem(PENDING_KEY) } catch { /* storage blocked */ }
}
function readPending(): PendingScan | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<PendingScan>
    if (typeof p.documentId !== 'string' || typeof p.startedAt !== 'number') { clearPending(); return null }
    if (Date.now() - p.startedAt > PENDING_MAX_AGE_MS) { clearPending(); return null }
    return { documentId: p.documentId, startedAt: p.startedAt }
  } catch { return null }
}

// Always checks at least once, so a page that wakes up after the window has
// passed (phone was locked for a while) still finds a result saved meanwhile.
async function findSavedAnalysis(documentId: string, windowMs: number, isCancelled: () => boolean): Promise<string | null> {
  const deadline = Date.now() + windowMs
  do {
    if (isCancelled()) return null
    try {
      const res = await fetch(`/api/analysis-for-document?document_id=${encodeURIComponent(documentId)}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json() as { analysis_id?: string | null }
        if (data.analysis_id) return data.analysis_id
      }
    } catch { /* offline for a moment; try again */ }
    if (Date.now() >= deadline) break
    await delay(RECOVER_POLL_MS)
  } while (Date.now() < deadline)
  return null
}

type AnalyzeOutcome = { ok: boolean; status: number; text: string } | null

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

  // A scan that started in this tab but whose page was reloaded or restored
  // (iPhone Safari does this after an app switch or a locked screen): pick the
  // saved result up instead of leaving the person on an empty page.
  useEffect(() => {
    let stopped = false
    let busy = false
    const resume = async (showProgress: boolean) => {
      if (busy || stopped) return
      const pending = readPending()
      if (!pending) return
      busy = true
      if (showProgress) {
        setState(s => s.phase === 'idle'
          ? { ...INITIAL_STATE, phase: 'analyzing', progress: 90, progressLabel: 'Checking for your result...' }
          : s)
      }
      const savedId = await findSavedAnalysis(pending.documentId, RECOVER_WINDOW_MS, () => stopped || readPending()?.documentId !== pending.documentId)
      busy = false
      if (stopped) return
      if (savedId) {
        clearPending()
        track('scan_recovered', { how: 'resume' })
        window.location.href = `/r/${savedId}`
        return
      }
      if (showProgress && readPending()?.documentId === pending.documentId) {
        clearPending()
        setState(s => s.phase === 'analyzing' && s.progressLabel === 'Checking for your result...'
          ? { ...INITIAL_STATE, phase: 'error', error: 'Your bill uploaded, but the analysis didn\'t come back. Please try again in a minute.' }
          : s)
      }
    }
    resume(true)
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) resume(false) }
    window.addEventListener('pageshow', onPageShow)
    return () => {
      stopped = true
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  // Keep the bar moving while the AI works (about a minute for a real bill),
  // so a long scan doesn't look frozen. It stops short of the end on its own.
  useEffect(() => {
    if (state.phase !== 'analyzing') return
    const id = setInterval(() => {
      setState(s => (s.phase === 'analyzing' && s.progress < 92 ? { ...s, progress: s.progress + 1 } : s))
    }, 2000)
    return () => clearInterval(id)
  }, [state.phase])

  const handleUpload = useCallback(async (picked: File) => {
    setState({ ...INITIAL_STATE, phase: 'uploading', progress: 10, progressLabel: 'Uploading file...' })
    let fileKb = Math.round(picked.size / 1024)
    let uploadedDocId: string | null = null
    let settled = false
    const openSavedResult = (id: string, how: string, documentType: string | null) => {
      settled = true
      clearPending()
      track('scan_recovered', { how, document_type: documentType ?? undefined })
      setPhase('analyzing', 98, 'Opening your result...')
      window.location.href = `/r/${id}`
    }
    try {
      // Shrink large phone photos first: the host refuses bodies over ~6 MB.
      const file = await prepareUpload(picked)
      fileKb = Math.round(file.size / 1024)
      if (file.size > UPLOAD_MAX_BYTES) {
        track('scan_error', { stage: 'too_large', file_type: file.type || 'unknown', file_kb: fileKb })
        setState(s => ({ ...s, phase: 'error', error: 'That file is too big to scan. Try a photo of the bill or a PDF under 4 MB.' }))
        return
      }

      const form = new FormData()
      form.append('file', file)
      setPhase('uploading', 25, 'Uploading file...')

      // A signed-in user's token is optional; never let the auth lookup stop
      // the scan itself.
      let authToken: string | undefined
      try {
        const client = await getBrowserSupabase()
        const { data: sessionData } = await client.auth.getSession()
        authToken = sessionData?.session?.access_token
      } catch { /* scan as a signed-out visitor */ }
      const uploadHeaders: Record<string, string> = {}
      if (authToken) uploadHeaders['x-supabase-token'] = authToken
      if (refToken)  uploadHeaders['x-ref-token'] = refToken

      const uploadRes  = await fetch('/api/upload', { method: 'POST', body: form, headers: uploadHeaders })
      // The host answers some failures (e.g. 413 body too large) with a
      // non-JSON page, so never assume JSON here.
      const uploadText = await uploadRes.text()
      let uploadData: { error?: string } & Partial<UploadResponse> = {}
      try { uploadData = JSON.parse(uploadText) } catch { /* non-JSON response */ }

      if (!uploadRes.ok) {
        if (uploadRes.status === 429 || uploadData.error === 'LIMIT_REACHED') {
          setState(INITIAL_STATE)
          setShowPaywall(true)
          return
        }
        track('scan_error', { stage: 'upload', status: uploadRes.status, file_type: file.type || 'unknown', file_kb: fileKb })
        const message = uploadRes.status === 413
          ? 'That file is too big to scan. Try a photo of the bill or a PDF under 4 MB.'
          : uploadData.error ?? 'Upload failed. Please try again.'
        setState(s => ({ ...s, phase: 'error', error: message }))
        return
      }

      const { document_id, document_type, limit_reached } = uploadData as UploadResponse
      // From here on the bill is uploaded, so a failure must never be reported
      // as an upload problem: the analysis may still finish and be saved.
      uploadedDocId = document_id
      savePending({ documentId: document_id, startedAt: Date.now() })
      if (limit_reached) setLimitReached(true)
      if (refToken) { setRefToken(null); setRefBanner(false) }
      setPhase('parsing', 45, 'Reading your document...')
      await delay(400)
      setPhase('analyzing', 65, 'Running AI analysis...')

      let handedOff = false
      const analyzeOutcome: Promise<AnalyzeOutcome> = fetch(
        `${SUPABASE_URL}/functions/v1/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ document_id }),
        }
      ).then(async r => ({ ok: r.ok, status: r.status, text: await r.text() }))
       .catch(() => null)

      // Look for the saved result alongside the request, so a request the
      // phone silently dropped doesn't decide the outcome.
      const earlyRecovery = delay(RECOVER_AFTER_MS)
        .then(() => (settled || handedOff) ? null : findSavedAnalysis(document_id, RECOVER_WINDOW_MS, () => settled || handedOff))

      const first = await Promise.race([
        analyzeOutcome.then(outcome => ({ kind: 'analyze' as const, outcome })),
        earlyRecovery.then(id => ({ kind: 'recovered' as const, id })),
      ])

      if (first.kind === 'recovered') {
        if (first.id) { openSavedResult(first.id, 'slow_request', document_type); return }
        if (!handedOff) {
          settled = true
          clearPending()
          track('scan_error', { stage: 'analyze', status: 'no_result_after_wait' })
          setState(s => ({ ...s, phase: 'error', error: 'This one is taking longer than it should. Please try again in a minute.' }))
          return
        }
      }

      const outcome = first.kind === 'analyze' ? first.outcome : null
      // The request itself broke (network drop, app switched away) or the
      // function failed on the server side: the analysis may still have been
      // saved, so check first.
      if (!outcome || outcome.status >= 500) {
        handedOff = true
        setPhase('analyzing', 90, 'Still working, checking for your result...')
        const savedId = await findSavedAnalysis(document_id, RECOVER_WINDOW_MS, () => settled)
        if (savedId) { openSavedResult(savedId, outcome ? `status_${outcome.status}` : 'network', document_type); return }
      }
      settled = true
      clearPending()
      setPhase('analyzing', 95, 'Computing your Screwed Score...')

      let analyzeData: { error?: string; analysis_id?: string; result?: AnalyzeResponse['result'] } = {}
      try { analyzeData = JSON.parse(outcome?.text ?? '') } catch { /* non-JSON response */ }
      if (!outcome || !outcome.ok || !analyzeData.result || !analyzeData.analysis_id) {
        track('scan_error', { stage: 'analyze', status: outcome?.status ?? 'network' })
        setState(s => ({ ...s, phase: 'error', error: analyzeData.error ?? 'The analysis didn\'t finish. Please try again.' }))
        return
      }

      const { analysis_id, result } = analyzeData as unknown as AnalyzeResponse
      try {
        ;(window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.(
          'event', 'scan_complete',
          { score: result.screwed_score, document_type, screwed_score_percent: result.screwed_score_percent }
        )
      } catch { /* analytics must never break a finished scan */ }
      setState(s => ({
        ...s, phase: 'done', progress: 100, progressLabel: 'Done',
        analysisId: analysis_id, documentType: document_type,
        result: { ...result, created_at: new Date().toISOString() },
      }))
    } catch (err) {
      // Record what failed so the next one can be diagnosed from analytics.
      track('scan_error', {
        stage: uploadedDocId ? 'after_upload' : 'network',
        error_name: err instanceof Error ? err.name : 'unknown',
        file_type: picked.type || 'unknown',
        file_kb: fileKb,
      })
      if (uploadedDocId && !settled) {
        // The bill reached us; the analysis may well finish. Look for it
        // before showing any error.
        const docId = uploadedDocId
        setPhase('analyzing', 90, 'Still working, checking for your result...')
        const savedId = await findSavedAnalysis(docId, RECOVER_WINDOW_MS, () => settled)
        if (savedId) { openSavedResult(savedId, 'after_error', null); return }
        settled = true
        clearPending()
        setState(s => ({ ...s, phase: 'error', error: 'Your bill uploaded, but the analysis didn\'t come back. Please try again in a minute.' }))
        return
      }
      setState(s => ({
        ...s, phase: 'error',
        error: 'The upload didn\'t go through. Check your connection and try again. If the file came from cloud storage, save it to your phone first.',
      }))
    }
  }, [refToken])

  const handleReset = useCallback(() => {
    clearPending()
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
