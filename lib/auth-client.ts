import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase-public'

let _client: ReturnType<typeof createClient> | null = null

export function getAuthClient() {
  if (!_client) {
    _client = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
    )
  }
  return _client
}
