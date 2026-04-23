-- Add business profile fields to vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS claimed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bio            text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tagline        text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS logo_url       text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verified       boolean DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS response_statement text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS claimed_at     timestamptz;

-- Owners can update their own claimed profile
CREATE POLICY IF NOT EXISTS "vendors_owner_update"
  ON vendors FOR UPDATE
  USING (auth.uid() = claimed_by);

-- Fast lookup: which vendor does this auth user own?
CREATE INDEX IF NOT EXISTS vendors_claimed_by_idx ON vendors(claimed_by) WHERE claimed_by IS NOT NULL;
