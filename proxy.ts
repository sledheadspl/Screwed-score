import { NextRequest, NextResponse } from 'next/server'

/**
 * Global middleware — adds security headers to every response.
 * Runs on the Edge runtime before any route handler.
 */
export function proxy(req: NextRequest): NextResponse {
  const res = NextResponse.next()

  // Edge-cache prerendered marketing/landing pages. Setting Netlify-CDN-Cache-Control
  // here (response-level from middleware) is what actually triggers Netlify Edge storage;
  // the same directive in netlify.toml [[headers]] does NOT (verified 2026-04-28).
  const EDGE_CACHEABLE = new Set(['/', '/clippilot', '/productivity', '/community', '/shame', '/for-businesses', '/jobs', '/weekly'])
  if (EDGE_CACHEABLE.has(req.nextUrl.pathname)) {
    res.headers.set('Netlify-CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400')
  }

  // Prevent page from being embedded in iframes on other origins
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')

  // Stop browser from MIME-sniffing responses away from the declared content-type
  res.headers.set('X-Content-Type-Options', 'nosniff')

  // Only send origin (no path/query) in the Referer header for cross-origin requests
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Disable browser features not used by this app
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Basic Content-Security-Policy
  // - default-src 'self'                 → block everything not explicitly allowed
  // - script-src  'self' 'unsafe-inline' → needed for Next.js inline scripts + GA
  // - style-src   'self' 'unsafe-inline' → needed for Tailwind inline styles
  // - img-src     'self' data: blob: *.supabase.co → user uploads served from Supabase
  // - connect-src 'self' *.supabase.co *.stripe.com → API calls
  // - frame-src   'self' *.stripe.com → Stripe Checkout iframe
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://js.stripe.com https://www.google.com https://www.gstatic.com https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: https://*.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.stripe.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://googleads.g.doubleclick.net https://www.google.com https://www.googleadservices.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )

  return res
}

export const config = {
  // Apply to all routes except static files and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
