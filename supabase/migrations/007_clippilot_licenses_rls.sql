-- Enable Row Level Security on clippilot_licenses.
-- All access is via the service role client in API routes — no anon/auth policies needed.
-- This prevents the anon key from reading or writing license data directly via the REST API.

ALTER TABLE clippilot_licenses ENABLE ROW LEVEL SECURITY;
