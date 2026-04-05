-- ── Rename rate_limits column to be semantically accurate ────────────────────
-- analyses_count was misleadingly named; the table is used for all request
-- rate-limiting (uploads, checkout, waitlist, etc.), not just analyses.

alter table rate_limits rename column analyses_count to request_count;

-- ── Atomic upvote increment (prevents read-modify-write race condition) ───────
create or replace function increment_upvotes(experience_id uuid)
returns void
language sql
security definer
as $$
  update experiences
  set upvotes = upvotes + 1
  where id = experience_id;
$$;
