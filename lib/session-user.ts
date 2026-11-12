import { createServerClient } from '@supabase/ssr'

/**
 * Supabase Auth user id for the request's session cookies, or null when the
 * caller isn't signed in. Works for both App Router (req.headers.get('cookie'))
 * and Pages Router (req.headers.cookie) callers.
 */
export async function getSessionUserId(cookieHeader: string | null | undefined): Promise<string | null> {
  const raw = cookieHeader ?? ''
  try {
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => raw.split(';').map(c => {
            const [n, ...rest] = c.trim().split('=')
            return { name: n, value: rest.join('=') }
          }),
          setAll: () => {},
        },
      }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}
