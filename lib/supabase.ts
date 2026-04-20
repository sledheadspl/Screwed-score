import { createClient } from '@supabase/supabase-js'

// Netlify Supabase extension provides SUPABASE_URL + SUPABASE_ANON_KEY (server-side).
// NEXT_PUBLIC_ vars are kept as fallback for local dev and browser-side usage.
const supabaseUrl  = process.env.SUPABASE_URL  ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server client (service role) — only import in API routes / server components
export function createServiceClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Browser client (anon key) — lazily initialized to avoid module-level
// failures at build time when env vars are not yet set.
let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnon)
  }
  return _supabase
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_: ReturnType<typeof createClient>, prop: string | symbol) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getSupabase() as any)[prop]
  },
})
