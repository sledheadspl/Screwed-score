-- Stripe webhook idempotency: dedup table.
-- Stripe retries failed webhooks (up to 3 days). Without dedup, every retry
-- re-runs the handler — fires another product email, another GA purchase
-- event, creates another Human Audit job. This guarantees each event.id
-- is only ever processed once.

create table if not exists stripe_webhook_events (
  event_id     text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_processed_at_idx
  on stripe_webhook_events(processed_at desc);

alter table stripe_webhook_events enable row level security;

drop policy if exists "Service role manages stripe_webhook_events" on stripe_webhook_events;
create policy "Service role manages stripe_webhook_events"
  on stripe_webhook_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
