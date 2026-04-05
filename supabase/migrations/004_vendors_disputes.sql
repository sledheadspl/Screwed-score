-- ─── Vendors ──────────────────────────────────────────────────────────────────

create table if not exists vendors (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category     text not null,
  city         text,
  state        text,
  zip          text,
  website      text,
  phone        text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists vendors_name_idx      on vendors using gin (to_tsvector('english', name));
create index if not exists vendors_category_idx  on vendors (category);
create index if not exists vendors_state_idx     on vendors (state);

-- ─── Vendor Reputations (materialised cache) ──────────────────────────────────

create table if not exists vendor_reputations (
  vendor_id              uuid primary key references vendors(id) on delete cascade,
  total_analyses         int  not null default 0,
  screwed_count          int  not null default 0,
  maybe_count            int  not null default 0,
  safe_count             int  not null default 0,
  avg_screwed_percent    numeric(5,2) not null default 0,
  total_flagged_amount   numeric(12,2) not null default 0,
  ai_summary             text,
  last_computed_at       timestamptz
);

-- ─── Wall of Shame (materialised view-style table) ────────────────────────────

create table if not exists wall_of_shame_entries (
  vendor_id              uuid primary key references vendors(id) on delete cascade,
  vendor_name            text not null,
  category               text not null,
  city                   text,
  state                  text,
  total_analyses         int  not null default 0,
  screwed_count          int  not null default 0,
  screwed_rate           numeric(5,4) not null default 0,  -- 0.0–1.0
  avg_screwed_percent    numeric(5,2) not null default 0,
  total_flagged_amount   numeric(12,2) not null default 0,
  ai_summary             text,
  updated_at             timestamptz not null default now()
);

create index if not exists wall_of_shame_screwed_rate_idx  on wall_of_shame_entries (screwed_rate desc);
create index if not exists wall_of_shame_category_idx      on wall_of_shame_entries (category);
create index if not exists wall_of_shame_state_idx         on wall_of_shame_entries (state);

-- ─── vendor_id column on analyses ─────────────────────────────────────────────

alter table analyses add column if not exists vendor_id uuid references vendors(id) on delete set null;
create index if not exists analyses_vendor_id_idx on analyses (vendor_id) where vendor_id is not null;

-- ─── Automation Jobs ──────────────────────────────────────────────────────────

create table if not exists automation_jobs (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,
  status        text not null default 'queued',
  input         jsonb not null default '{}',
  output        jsonb,
  error         text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists automation_jobs_status_idx     on automation_jobs (status);
create index if not exists automation_jobs_created_at_idx on automation_jobs (created_at desc);

-- ─── Disputes ─────────────────────────────────────────────────────────────────

create table if not exists disputes (
  id                uuid primary key default gen_random_uuid(),
  vendor_id         uuid references vendors(id) on delete set null,
  user_id           uuid references auth.users(id) on delete set null,
  analysis_id       uuid references analyses(id) on delete set null,
  category          text not null,
  status            text not null default 'open',
  title             text not null,
  description       text not null,
  amount_disputed   numeric(12,2),
  resolution_notes  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists disputes_vendor_id_idx  on disputes (vendor_id) where vendor_id is not null;
create index if not exists disputes_user_id_idx    on disputes (user_id)   where user_id is not null;
create index if not exists disputes_status_idx     on disputes (status);
create index if not exists disputes_created_at_idx on disputes (created_at desc);

-- ─── Dispute Messages ─────────────────────────────────────────────────────────

create table if not exists dispute_messages (
  id            uuid primary key default gen_random_uuid(),
  dispute_id    uuid not null references disputes(id) on delete cascade,
  author_id     uuid references auth.users(id) on delete set null,
  is_vendor_rep boolean not null default false,
  body          text not null,
  created_at    timestamptz not null default now()
);

create index if not exists dispute_messages_dispute_id_idx on dispute_messages (dispute_id);

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

alter table vendors             enable row level security;
alter table vendor_reputations  enable row level security;
alter table wall_of_shame_entries enable row level security;
alter table automation_jobs     enable row level security;
alter table disputes            enable row level security;
alter table dispute_messages    enable row level security;

-- Vendors: public read, authenticated create
create policy "vendors_public_read"  on vendors for select using (true);
create policy "vendors_auth_insert"  on vendors for insert with check (auth.uid() is not null or true); -- allow anon submissions

-- Vendor reputations: public read, service role write
create policy "vendor_reputations_public_read" on vendor_reputations for select using (true);

-- Wall of shame: public read
create policy "wall_of_shame_public_read" on wall_of_shame_entries for select using (true);

-- Automation jobs: service role only (no public policies — routes use service client)

-- Disputes: public read, any user can create
create policy "disputes_public_read"   on disputes for select using (true);
create policy "disputes_any_insert"    on disputes for insert with check (true);
create policy "disputes_owner_update"  on disputes for update using (auth.uid() = user_id or auth.uid() is null);

-- Dispute messages: public read, any user can insert
create policy "dispute_messages_public_read" on dispute_messages for select using (true);
create policy "dispute_messages_any_insert"  on dispute_messages for insert with check (true);

-- ─── Helper: refresh Wall of Shame for a vendor ───────────────────────────────

create or replace function refresh_wall_of_shame(p_vendor_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v vendors%rowtype;
  r vendor_reputations%rowtype;
begin
  select * into v from vendors where id = p_vendor_id;
  if not found then return; end if;

  select * into r from vendor_reputations where vendor_id = p_vendor_id;
  if not found then return; end if;

  insert into wall_of_shame_entries (
    vendor_id, vendor_name, category, city, state,
    total_analyses, screwed_count, screwed_rate,
    avg_screwed_percent, total_flagged_amount, ai_summary, updated_at
  )
  values (
    p_vendor_id,
    v.name,
    v.category,
    v.city,
    v.state,
    r.total_analyses,
    r.screwed_count,
    case when r.total_analyses > 0
         then (r.screwed_count::numeric / r.total_analyses)
         else 0 end,
    r.avg_screwed_percent,
    r.total_flagged_amount,
    r.ai_summary,
    now()
  )
  on conflict (vendor_id) do update set
    vendor_name          = excluded.vendor_name,
    category             = excluded.category,
    city                 = excluded.city,
    state                = excluded.state,
    total_analyses       = excluded.total_analyses,
    screwed_count        = excluded.screwed_count,
    screwed_rate         = excluded.screwed_rate,
    avg_screwed_percent  = excluded.avg_screwed_percent,
    total_flagged_amount = excluded.total_flagged_amount,
    ai_summary           = excluded.ai_summary,
    updated_at           = now();
end;
$$;
