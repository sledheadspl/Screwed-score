-- Migration 003: indexes and constraints on the documents table

-- ─── Indexes ──────────────────────────────────────────────────────────────────
-- Speeds up the common query pattern: fetch documents for a given user
create index if not exists documents_user_id_idx     on documents(user_id);

-- Speeds up filtering/analytics by document type
create index if not exists documents_type_idx        on documents(document_type);

-- Speeds up time-range queries and dashboard ordering
create index if not exists documents_created_at_idx  on documents(created_at desc);

-- ─── Constraints ─────────────────────────────────────────────────────────────
-- Prevent duplicate uploads to the same storage path (non-null only)
create unique index if not exists documents_storage_path_unique
  on documents(storage_path)
  where storage_path is not null;

-- ─── Analyses extra index ─────────────────────────────────────────────────────
-- Speeds up the public recent-scans query used on the homepage
create index if not exists analyses_public_created_idx
  on analyses(created_at desc)
  where is_public = true;
