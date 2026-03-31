-- Referral tokens: one-use links that give a friend a free scan bypass
create table if not exists referral_tokens (
  id         uuid primary key default gen_random_uuid(),
  token      text unique not null,
  referrer_analysis_id text,          -- optional: which analysis generated this
  used       boolean not null default false,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Index for fast token lookups
create index if not exists referral_tokens_token_idx on referral_tokens(token);

-- Auto-expire tokens after 30 days (cleanup only — not enforced at query time)
-- RLS: no user access, only service role via API
alter table referral_tokens enable row level security;

-- No public access — all reads/writes go through the service role in API routes
create policy "No public access" on referral_tokens
  for all using (false);
