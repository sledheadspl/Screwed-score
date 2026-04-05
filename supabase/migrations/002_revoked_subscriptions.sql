-- Migration 002: revoked subscriptions + rate_limits maintenance

-- ─── Revoked Subscriptions ───────────────────────────────────────────────────
-- Populated by the Stripe webhook when a subscription is cancelled or payment fails.
-- The upload route checks this table to deny Pro access even if a valid JWT cookie exists.
create table if not exists revoked_subscriptions (
  subscription_id text primary key,
  reason          text not null default 'cancelled', -- 'cancelled' | 'payment_failed'
  revoked_at      timestamptz not null default now()
);

alter table revoked_subscriptions enable row level security;

drop policy if exists "Service role manages revoked subscriptions" on revoked_subscriptions;
create policy "Service role manages revoked subscriptions"
  on revoked_subscriptions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ─── Rate Limits: stale-row cleanup function ─────────────────────────────────
-- Call this on a schedule (e.g. daily via pg_cron or Supabase scheduled functions)
-- to prevent the rate_limits table from growing unbounded.
create or replace function cleanup_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from rate_limits
  where updated_at < now() - interval '48 hours';
$$;

-- ─── Index for rate_limits cleanup queries ────────────────────────────────────
create index if not exists rate_limits_updated_at_idx on rate_limits(updated_at);
