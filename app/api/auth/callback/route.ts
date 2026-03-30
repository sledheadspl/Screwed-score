import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl
  const code   = searchParams.get('code')
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin

  if (!code) {
    // No code param — user cancelled OAuth or followed a stale link
    return NextResponse.redirect(origin)
  }

  try {
    // Build the redirect response first so the Supabase client can attach cookies to it
    const res = NextResponse.redirect(origin)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (toSet) =>
            toSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            ),
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
      return NextResponse.redirect(`${origin}?auth_error=1`)
    }

    return res
  } catch (err) {
    console.error('[auth/callback] Unexpected error:', err)
    return NextResponse.redirect(`${origin}?auth_error=1`)
  }
}
