-- GetScrewedScore schema
-- Safe to re-run: drops existing policies before recreating

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  email                     text,
  plan                      text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  trial_videos_used         integer not null default 0 check (trial_videos_used >= 0),
  analyses_used_this_month  integer not null default 0 check (analyses_used_this_month >= 0),
  referral_code             text unique default upper(substring(md5(random()::text), 1, 8)),
  referred_by               text,
  stripe_customer_id        text,
  stripe_subscription_id    text,
  subscription_status       text not null default 'inactive',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Add columns that may be missing if profiles table was created by ContractGuard
alter table profiles add column if not exists trial_videos_used        integer not null default 0 check (trial_videos_used >= 0);
alter table profiles add column if not exists analyses_used_this_month integer not null default 0 check (analyses_used_this_month >= 0);
alter table profiles add column if not exists referral_code            text unique default upper(substring(md5(random()::text), 1, 8));
alter table profiles add column if not exists referred_by              text;
alter table profiles add column if not exists subscription_status      text not null default 'inactive';

alter table profiles enable row level security;

drop policy if exists "Users can view own profile"   on profiles;
drop policy if exists "Users can update own profile" on profiles;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── Documents ───────────────────────────────────────────────────────────────
create table if not exists documents (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references profiles(id) on delete set null,
  original_file_name  text not null,
  storage_path        text,
  mime_type           text not null,
  extracted_text      text,
  document_type       text not null default 'unknown',
  file_size_bytes     integer check (file_size_bytes > 0),
  ip_hash             text,
  created_at          timestamptz not null default now()
);

alter table documents enable row level security;

drop policy if exists "Users can view own documents"   on documents;
drop policy if exists "Users can insert own documents" on documents;

create policy "Users can view own documents"
  on documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on documents for insert
  with check (user_id is null or user_id = auth.uid());

-- ─── Analyses ────────────────────────────────────────────────────────────────
create table if not exists analyses (
  id                    uuid primary key default uuid_generate_v4(),
  document_id           uuid references documents(id) on delete cascade,
  user_id               uuid references profiles(id) on delete set null,
  screwed_score         text not null check (screwed_score in ('SCREWED', 'MAYBE', 'SAFE')),
  screwed_score_percent integer not null check (screwed_score_percent between 0 and 100),
  screwed_score_reason  text not null,
  document_type         text not null,
  plain_summary         text,
  what_they_tried       jsonb not null default '[]',
  what_to_do_next       jsonb not null default '[]',
  top_findings          jsonb not null default '[]',
  overcharge_output     jsonb not null default '{}',
  contract_guard_output jsonb not null default '{}',
  is_public             boolean not null default true,
  share_views           integer not null default 0 check (share_views >= 0),
  language              text not null default 'en',
  created_at            timestamptz not null default now()
);

alter table analyses enable row level security;

drop policy if exists "Public analyses readable by anyone"    on analyses;
drop policy if exists "Users can view own private analyses"   on analyses;
drop policy if exists "Service role can insert analyses"      on analyses;

create policy "Public analyses readable by anyone"
  on analyses for select
  using (is_public = true);

create policy "Users can view own private analyses"
  on analyses for select
  using (auth.uid() = user_id);

create policy "Service role can insert analyses"
  on analyses for insert
  with check (auth.role() = 'service_role');

create index if not exists analyses_user_id_idx      on analyses(user_id);
create index if not exists analyses_created_at_idx   on analyses(created_at desc);
create index if not exists analyses_screwed_score_idx on analyses(screwed_score);
create index if not exists analyses_document_id_idx  on analyses(document_id);

-- ─── Waitlist ────────────────────────────────────────────────────────────────
create table if not exists waitlist (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null unique check (length(email) <= 254 and email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  source      text not null default 'result_page' check (source in ('result_page', 'share_page', 'landing')),
  analysis_id uuid references analyses(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table waitlist enable row level security;

drop policy if exists "Service role manages waitlist" on waitlist;

create policy "Service role manages waitlist"
  on waitlist for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ─── Rate Limits ─────────────────────────────────────────────────────────────
create table if not exists rate_limits (
  ip_hash        text primary key,
  analyses_count integer not null default 0 check (analyses_count >= 0),
  window_start   timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table rate_limits enable row level security;

drop policy if exists "Service role manages rate limits" on rate_limits;

create policy "Service role manages rate limits"
  on rate_limits for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ─── Functions ───────────────────────────────────────────────────────────────

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create or replace function increment_share_views(p_analysis_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update analyses
  set share_views = share_views + 1
  where id = p_analysis_id and is_public = true;
$$;

create or replace function reset_monthly_usage()
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set analyses_used_this_month = 0;
$$;
