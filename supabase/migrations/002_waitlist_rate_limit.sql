-- Add per-IP waitlist rate limiting columns to rate_limits table
alter table rate_limits
  add column if not exists waitlist_count        integer     not null default 0 check (waitlist_count >= 0),
  add column if not exists waitlist_window_start timestamptz not null default now();
