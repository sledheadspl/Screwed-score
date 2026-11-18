/**
 * Public Supabase settings: the project URL and the anon key.
 *
 * Both are public by design (they ship in every browser bundle, and access is
 * governed by row level security). They are read from NEXT_PUBLIC_* env vars,
 * which Next.js inlines at BUILD time. If a var is missing from the build
 * environment, client code gets `undefined` at runtime and every scan fails
 * before the upload request is sent. That happened in production, so each
 * value falls back to this project's own public value.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yvlwrkskjnhlismuagyq.supabase.co'

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bHdya3Nram5obGlzbXVhZ3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjY5NTgsImV4cCI6MjA5MDE0Mjk1OH0.5zzLs_eyp6IMPTQGC1_f0-1gDp_jN1c1UpV6gLNn-U4'
