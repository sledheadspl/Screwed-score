-- Business reputation scores — aggregated from community experiences
CREATE TABLE IF NOT EXISTS business_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name   text NOT NULL,
  business_slug   text NOT NULL UNIQUE,
  category        text NOT NULL,
  city            text,
  state           text,
  screwed_count   integer DEFAULT 0,
  maybe_count     integer DEFAULT 0,
  safe_count      integer DEFAULT 0,
  total_count     integer DEFAULT 0,
  screwed_percent integer DEFAULT 0,
  total_flagged_dollars integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE business_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_scores_public_read" ON business_scores FOR SELECT USING (true);
CREATE POLICY "business_scores_service_write" ON business_scores FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS business_scores_slug_idx     ON business_scores (business_slug);
CREATE INDEX IF NOT EXISTS business_scores_category_idx ON business_scores (category);
CREATE INDEX IF NOT EXISTS business_scores_screwed_idx  ON business_scores (screwed_percent DESC);
