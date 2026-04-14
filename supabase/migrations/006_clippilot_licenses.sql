-- ClipPilot license keys issued on purchase
CREATE TABLE IF NOT EXISTS clippilot_licenses (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key       text        UNIQUE NOT NULL,
  tier              text        NOT NULL CHECK (tier IN ('pro', 'unlimited')),
  stripe_session_id text        UNIQUE NOT NULL,
  customer_email    text        NOT NULL,
  product_id        text        NOT NULL,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clippilot_licenses_key_idx ON clippilot_licenses(license_key);
