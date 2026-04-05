-- ── Trusted Providers Directory ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  category        text NOT NULL,
  city            text,
  state           text,
  website         text,
  phone           text,
  description     text,
  verified        boolean DEFAULT false,
  trust_score     integer DEFAULT 0,
  review_count    integer DEFAULT 0,
  submitted_by    text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers_public_read"  ON providers FOR SELECT USING (true);
CREATE POLICY "providers_anon_insert"  ON providers FOR INSERT WITH CHECK (true);

-- ── Community Experiences ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS experiences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name   text NOT NULL,
  category        text NOT NULL,
  score           text NOT NULL CHECK (score IN ('SCREWED', 'MAYBE', 'SAFE')),
  story           text,
  city            text,
  state           text,
  amount_dollars  integer,
  analysis_id     uuid,
  upvotes         integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experiences_public_read"  ON experiences FOR SELECT USING (true);
CREATE POLICY "experiences_anon_insert"  ON experiences FOR INSERT WITH CHECK (true);
CREATE POLICY "experiences_upvote"       ON experiences FOR UPDATE USING (true) WITH CHECK (true);

-- Index for fast category+score lookups
CREATE INDEX IF NOT EXISTS experiences_category_idx ON experiences (category);
CREATE INDEX IF NOT EXISTS experiences_score_idx    ON experiences (score);
CREATE INDEX IF NOT EXISTS providers_category_idx   ON providers (category);
