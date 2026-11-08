/**
 * Client-side GA4 event helper for the upload funnel:
 *   page_view (automatic) -> sample_click / upload_click -> file_selected
 *   -> scan_complete | scan_error
 *
 * Calls go through the gtag queue that the `gtag-init` script in app/layout.tsx
 * sets up right after hydration. gtag.js itself still loads lazily; it drains
 * the queue when it arrives, so early clicks are not lost. Never throws.
 */
type Params = Record<string, string | number | boolean | undefined>

export function track(event: string, params: Params = {}): void {
  try {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] }
    if (w.gtag) {
      w.gtag('event', event, params)
    } else {
      // Init script hasn't run yet: queue in the same shape gtag uses.
      w.dataLayer = w.dataLayer || []
      // eslint-disable-next-line prefer-rest-params
      ;(function (..._a: unknown[]) { w.dataLayer!.push(arguments) })('event', event, params)
    }
  } catch {
    /* analytics must never break the page */
  }
}
