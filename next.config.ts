import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['mammoth'],
  // Import only the icon modules actually referenced, instead of the whole
  // lucide-react barrel file, and keep the Supabase SDK in its own lazy chunk.
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
  // Force webpack (disables Turbopack default in Next.js 16) — required for Netlify edge bundler compatibility
  webpack: (config) => config,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    // Marketing/landing pages: allow Netlify Edge to cache the prerendered HTML.
    // Netlify-CDN-Cache-Control on the response is what triggers Netlify Edge storage
    // (previously set from middleware/proxy.ts — moved here when middleware was removed).
    // s-maxage=300 = Edge stores 5min; stale-while-revalidate=86400 = serves stale up to 24h while refreshing.
    const edgeCacheable = ['/', '/clippilot', '/productivity', '/community', '/shame', '/for-businesses', '/jobs', '/weekly']
    return [
      ...edgeCacheable.map(source => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400' },
          { key: 'Netlify-CDN-Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=86400' },
        ],
      })),
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.gstatic.com https://connect.facebook.net https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://adservice.google.com https://fundingchoicesmessages.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://googleads.g.doubleclick.net https://www.google.com https://www.googleadservices.com https://pagead2.googlesyndication.com https://tpc.googlesyndication.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://*.supabase.co wss://*.supabase.co",
              "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://ep2.adtrafficquality.google",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
