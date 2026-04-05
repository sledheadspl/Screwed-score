-- Outcome reports: users self-report what happened after disputing their bill/contract
create table if not exists outcomes (
  id           uuid primary key default gen_random_uuid(),
  analysis_id  uuid not null references analyses(id) on delete cascade,
  outcome      text not null check (outcome in ('won', 'partial', 'lost', 'pending')),
  recovered    integer not null default 0 check (recovered >= 0),
  created_at   timestamptz not null default now(),
  unique(analysis_id)  -- one outcome report per analysis
);

alter table outcomes enable row level security;

drop policy if exists "Service role manages outcomes" on outcomes;
create policy "Service role manages outcomes"
  on outcomes for all
  using  (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Public can read outcomes" on outcomes;
create policy "Public can read outcomes"
  on outcomes for select
  using (true);
