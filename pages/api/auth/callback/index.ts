import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@supabase/ssr'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = typeof req.query.code === 'string' ? req.query.code : null
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://screwedscore.com'

  if (code) {
    const pendingCookies: string[] = []

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () =>
              Object.entries(req.cookies).map(([name, value]) => ({
                name,
                value: value ?? '',
              })),
            setAll: (toSet) => {
              for (const { name, value, options } of toSet) {
                pendingCookies.push(serializeCookie(name, value, options))
              }
            },
          },
        }
      )

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error

      if (pendingCookies.length > 0) {
        res.setHeader('Set-Cookie', pendingCookies)
      }
    } catch (err) {
      console.error('[auth/callback] OAuth exchange failed:', err)
      return res.redirect(302, `${origin}?auth_error=1`)
    }
  }

  res.redirect(302, origin)
}

function serializeCookie(
  name: string,
  value: string,
  options: Record<string, unknown> = {}
): string {
  let str = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
  if (options.path)     str += `; Path=${options.path}`
  if (options.maxAge)   str += `; Max-Age=${options.maxAge}`
  if (options.domain)   str += `; Domain=${options.domain}`
  if (options.httpOnly) str += '; HttpOnly'
  if (options.secure)   str += '; Secure'
  if (options.sameSite) str += `; SameSite=${options.sameSite}`
  return str
}
