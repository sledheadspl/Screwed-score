-- NOT YET APPLIED. Review, then apply from the Supabase dashboard (SQL editor)
-- or with `supabase db push`. Safe to run more than once: every statement is
-- DROP POLICY IF EXISTS. Policy names are the ones in the migration files;
-- check them against the live database before applying (see 015 for a case
-- where the live names differed).
--
-- What this closes:
--
-- 1. vendors_owner_update (009) let whoever is in vendors.claimed_by update
--    every column of that row straight through the public anon key. Business
--    claims now start as pending (verified = false) and only the operator can
--    approve them (PATCH /api/vendors/[id]/claim). With this policy still in
--    place a claimant could skip review by setting verified = true themselves,
--    or write a javascript: link into website / logo_url.
--
-- 2. workers_self_insert / workers_self_update (008) let a signed-in worker
--    write their own worker_profiles row directly, including is_verified,
--    is_banned and an unchecked website. The app saves worker profiles only
--    through /api/workers/profile with the service-role client, which
--    validates the website and bypasses RLS, so nothing in the app needs them.
--
-- 3. providers_anon_insert (community_tables.sql) let anyone insert providers
--    rows directly with any website value. 015 dropped "providers_insert";
--    this drops the other name. The app inserts providers only through
--    /api/providers (service-role client, https-only website check).
--
-- Public SELECT policies are left alone.

drop policy if exists "vendors_owner_update" on public.vendors;

do $$ begin
  if to_regclass('public.worker_profiles') is not null then
    execute 'drop policy if exists "workers_self_insert" on public.worker_profiles';
    execute 'drop policy if exists "workers_self_update" on public.worker_profiles';
  end if;
end $$;

do $$ begin
  if to_regclass('public.providers') is not null then
    execute 'drop policy if exists "providers_anon_insert" on public.providers';
  end if;
end $$;
