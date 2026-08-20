/**
 * Lazy browser Supabase client.
 *
 * `lib/supabase.ts` imports `@supabase/supabase-js` at module scope. Anything
 * that statically imports it therefore pulls ~213 KB of JS (supabase-js +
 * GoTrue) into that component's chunk. For components in the critical path —
 * the homepage and the Navbar in the root layout — that is the single largest
 * item on the wire, spent on an auth check that is not needed to paint.
 *
 * This module loads the SDK on demand instead, so it lands in its own chunk
 * that is fetched after first paint (or never, for signed-out visitors who
 * don't interact).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let clientPromise: Promise<SupabaseClient> | null = null

export function getBrowserSupabase(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(supabaseUrl, supabaseAnon)
    )
  }
  return clientPromise
}

/** True when a `gss_pro` cookie is present — no SDK needed. */
export function hasProCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().split('=')[0] === 'gss_pro')
}
