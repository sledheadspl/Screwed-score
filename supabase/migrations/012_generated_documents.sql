-- Stores AI-generated documents from /create
-- Accessible anonymously (no auth required) via session_id
-- Signed-in users can also retrieve by user_id

create table if not exists generated_documents (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null,           -- browser fingerprint / anon session
  user_id       uuid references auth.users(id) on delete set null,
  doc_type      text not null,
  doc_label     text not null,
  html          text not null,
  preview       text not null,           -- first ~120 chars stripped text
  share_slug    text unique,             -- short slug for shareable link
  created_at    timestamptz not null default now()
);

create index if not exists generated_documents_session_id_idx on generated_documents(session_id);
create index if not exists generated_documents_user_id_idx on generated_documents(user_id);
create index if not exists generated_documents_share_slug_idx on generated_documents(share_slug);

alter table generated_documents enable row level security;

-- Anyone can insert (anon or authed)
create policy "Anyone can insert generated_documents"
  on generated_documents for insert
  with check (true);

-- Read own documents by session_id (anon) or user_id (authed)
create policy "Read own generated_documents"
  on generated_documents for select
  using (
    session_id = current_setting('request.headers', true)::json->>'x-session-id'
    or user_id = auth.uid()
    or share_slug is not null  -- public share links readable by anyone
  );

-- Delete own documents
create policy "Delete own generated_documents"
  on generated_documents for delete
  using (
    session_id = current_setting('request.headers', true)::json->>'x-session-id'
    or user_id = auth.uid()
  );
