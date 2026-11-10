-- NOT YET APPLIED. Review, then apply from the Supabase dashboard (SQL editor)
-- or with `supabase db push`. Safe to run more than once, and safe to run
-- before or after 014 (every statement is IF EXISTS or idempotent).
--
-- What this closes (checked against the live database on Nov 10, 2026):
--
-- 1. Eight SECURITY DEFINER functions were callable by anyone with the public
--    anon key through /rest/v1/rpc/<name>. They run with owner rights, so RLS
--    does not stop them. The worst ones:
--      reset_monthly_usage()      zeroes every user's monthly scan counter
--      increment_usage(uuid)      burns any user's monthly scans
--      check_usage_limit(uuid)    reads any user's remaining quota
--      cleanup_rate_limits()      deletes rate-limit rows
--      refresh_wall_of_shame(uuid), increment_share_views(uuid)
--    plus two trigger functions (handle_new_user, rls_auto_enable).
--    Nothing in the app calls these with the anon key: the only RPC caller
--    (app/r/[id]/page.tsx) uses the service-role client, which keeps EXECUTE.
--    Triggers and event triggers do not check EXECUTE when they fire, so
--    sign-up and auto-RLS keep working. pg_cron jobs run as the owner.
--
-- 2. Open RLS policies (no TO clause, USING/WITH CHECK true) let the anon key
--    write straight to tables, skipping API routes and their rate limits.
--    Migration 014 drops most of them but uses two names that don't exist on
--    the live database ("business_scores_service_write" is live as "bs_write",
--    "experiences_upvote" is live as "experiences_update"). This drops the
--    live names too, plus the open INSERT policies. Every write to these
--    tables in the app goes through createServiceClient(), which bypasses RLS.
--    Public SELECT policies are left alone.

-- ── 1. Functions ─────────────────────────────────────────────────────────────
revoke execute on function public.check_usage_limit(uuid)       from public, anon, authenticated;
revoke execute on function public.increment_usage(uuid)         from public, anon, authenticated;
revoke execute on function public.reset_monthly_usage()         from public, anon, authenticated;
revoke execute on function public.cleanup_rate_limits()         from public, anon, authenticated;
revoke execute on function public.refresh_wall_of_shame(uuid)   from public, anon, authenticated;
revoke execute on function public.increment_share_views(uuid)   from public, anon, authenticated;
revoke execute on function public.handle_new_user()             from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()             from public, anon, authenticated;

grant execute on function public.check_usage_limit(uuid)       to service_role;
grant execute on function public.increment_usage(uuid)         to service_role;
grant execute on function public.reset_monthly_usage()         to service_role;
grant execute on function public.cleanup_rate_limits()         to service_role;
grant execute on function public.refresh_wall_of_shame(uuid)   to service_role;
grant execute on function public.increment_share_views(uuid)   to service_role;

-- Pin search_path on the functions the security advisor flags as mutable.
alter function public.check_usage_limit(uuid)     set search_path = public;
alter function public.increment_usage(uuid)       set search_path = public;
alter function public.refresh_wall_of_shame(uuid) set search_path = public;
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'update_contract_search_vector'
  loop
    execute format('alter function %s set search_path = public', f);
  end loop;
end $$;

-- ── 2. Open write policies ───────────────────────────────────────────────────
-- FOR ALL USING (true): anyone could read, edit or delete these rows.
-- (job_applications one exposed every applicant's cover note.)
drop policy if exists "bs_write"                      on public.business_scores;
drop policy if exists "business_scores_service_write" on public.business_scores;
drop policy if exists "rep_service_write"             on public.worker_reputations;
drop policy if exists "jobs_service_write"            on public.jobs;
drop policy if exists "applications_service_all"      on public.job_applications;
drop policy if exists "completions_service_write"     on public.job_completions;
drop policy if exists "flags_service_all"             on public.worker_flags;

-- UPDATE USING (true): anyone could rewrite any community story or upvote count.
drop policy if exists "experiences_update"   on public.experiences;
drop policy if exists "experiences_upvote"   on public.experiences;
do $$ begin
  if to_regclass('public.academy_posts') is not null then
    execute 'drop policy if exists "academy_posts_upvote" on public.academy_posts';
  end if;
end $$;

-- INSERT WITH CHECK (true): anyone could insert rows directly, skipping the
-- rate-limited API routes (spam on the Wall of Shame, disputes, providers).
drop policy if exists "experiences_insert"                    on public.experiences;
drop policy if exists "disputes_any_insert"                   on public.disputes;
drop policy if exists "dispute_messages_any_insert"           on public.dispute_messages;
drop policy if exists "Anyone can insert generated_documents" on public.generated_documents;
drop policy if exists "providers_insert"                      on public.providers;
drop policy if exists "vendors_auth_insert"                   on public.vendors;
