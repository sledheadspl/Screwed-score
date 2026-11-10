-- NOT YET APPLIED. Review, then apply from the Supabase dashboard (SQL editor)
-- or with `supabase db push`.
--
-- Several older migrations created policies like
--   CREATE POLICY "x_service_write" ON t FOR ALL USING (true);
-- intending "only the server can write". A policy with no TO clause applies to
-- every role, including `anon`, whose key ships in the browser bundle. So as
-- written, anyone holding the public anon key can read, update or delete these
-- rows directly through the Supabase REST API, skipping the API routes and
-- their rate limits entirely. For job_applications that includes reading every
-- applicant's cover note.
--
-- The service-role key already bypasses RLS, so these policies grant the
-- server nothing it doesn't have. Dropping them leaves every API route working
-- exactly as before. All writes to these tables in the app go through
-- createServiceClient() in server routes; nothing in the browser writes to them.
--
-- Public SELECT policies (e.g. business_scores_public_read, experiences
-- public reads) are left in place.

DROP POLICY IF EXISTS "business_scores_service_write" ON business_scores;
DROP POLICY IF EXISTS "rep_service_write"             ON worker_reputations;
DROP POLICY IF EXISTS "jobs_service_write"            ON jobs;
DROP POLICY IF EXISTS "applications_service_all"      ON job_applications;
DROP POLICY IF EXISTS "completions_service_write"     ON job_completions;
DROP POLICY IF EXISTS "flags_service_all"             ON worker_flags;

-- Anonymous UPDATE on community posts let anyone rewrite any story or set any
-- upvote count. Upvotes go through the rate-limited API routes, which use the
-- service-role key, so the anon UPDATE policy isn't needed.
DROP POLICY IF EXISTS "experiences_upvote"   ON experiences;
DROP POLICY IF EXISTS "academy_posts_upvote" ON academy_posts;
