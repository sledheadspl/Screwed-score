-- Email nurture sequence state on the waitlist table.
-- Each subscriber moves through 3 nurture emails over 7 days from signup.
--   step 0 → just subscribed, send email 1 in 24h
--   step 1 → email 1 sent, send email 2 in 48h (Day 3)
--   step 2 → email 2 sent, send email 3 in 96h (Day 7)
--   step 3 → sequence complete

alter table waitlist
  add column if not exists nurture_step      int                       not null default 0,
  add column if not exists nurture_next_at   timestamptz               default (now() + interval '24 hours'),
  add column if not exists nurture_last_sent timestamptz;

-- Backfill existing rows so they don't all get spammed at once
update waitlist
set nurture_step    = 3,
    nurture_next_at = null
where nurture_step = 0
  and created_at is not null
  and created_at < now() - interval '7 days';

-- Lookup index for the cron worker — only rows with pending sends
create index if not exists waitlist_nurture_due_idx
  on waitlist (nurture_next_at)
  where nurture_step < 3 and nurture_next_at is not null;
