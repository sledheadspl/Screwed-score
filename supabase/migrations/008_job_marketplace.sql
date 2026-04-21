-- ── Job Marketplace ─────────────────────────────────────────────────────────

-- Worker profiles (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS worker_profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  bio             text,
  skills          text[] DEFAULT '{}',
  availability    text DEFAULT 'available' CHECK (availability IN ('available','busy','paused')),
  city            text,
  state           text,
  website         text,
  is_verified     boolean DEFAULT false,
  is_banned       boolean DEFAULT false,
  ban_reason      text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workers_public_read"   ON worker_profiles FOR SELECT USING (true);
CREATE POLICY "workers_self_insert"   ON worker_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "workers_self_update"   ON worker_profiles FOR UPDATE USING (auth.uid() = id);

-- Worker reputation cache
CREATE TABLE IF NOT EXISTS worker_reputations (
  worker_id           uuid PRIMARY KEY REFERENCES worker_profiles(id) ON DELETE CASCADE,
  jobs_completed      integer DEFAULT 0,
  jobs_abandoned      integer DEFAULT 0,
  avg_rating          numeric(3,2) DEFAULT 0,
  reputation_score    integer DEFAULT 50,
  disputes_filed      integer DEFAULT 0,
  disputes_lost       integer DEFAULT 0,
  total_earned_cents  integer DEFAULT 0,
  last_computed_at    timestamptz DEFAULT now()
);

ALTER TABLE worker_reputations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rep_public_read"  ON worker_reputations FOR SELECT USING (true);
CREATE POLICY "rep_service_write" ON worker_reputations FOR ALL USING (true);

-- Jobs posted by the operator
CREATE TABLE IF NOT EXISTS jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text NOT NULL,
  category        text NOT NULL CHECK (category IN ('writing','design','outreach','research','dev','video','admin','other')),
  skills_required text[] DEFAULT '{}',
  pay_description text,
  location_type   text DEFAULT 'remote' CHECK (location_type IN ('remote','local','hybrid')),
  city            text,
  state           text,
  status          text DEFAULT 'open' CHECK (status IN ('open','filled','closed','cancelled')),
  min_reputation  integer DEFAULT 0,
  max_applicants  integer DEFAULT 20,
  posted_by       text DEFAULT 'operator',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_public_read"   ON jobs FOR SELECT USING (true);
CREATE POLICY "jobs_service_write" ON jobs FOR ALL USING (true);

-- Worker applications
CREATE TABLE IF NOT EXISTS job_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id       uuid NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  status          text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn')),
  cover_note      text,
  operator_notes  text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (job_id, worker_id)
);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_self_read"   ON job_applications FOR SELECT USING (auth.uid() = worker_id);
CREATE POLICY "applications_self_insert" ON job_applications FOR INSERT WITH CHECK (auth.uid() = worker_id);
CREATE POLICY "applications_service_all" ON job_applications FOR ALL USING (true);

-- Completed jobs with ratings
CREATE TABLE IF NOT EXISTS job_completions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid NOT NULL REFERENCES jobs(id),
  worker_id       uuid NOT NULL REFERENCES worker_profiles(id),
  application_id  uuid NOT NULL REFERENCES job_applications(id),
  rating          integer CHECK (rating BETWEEN 1 AND 5),
  rating_note     text,
  completed_at    timestamptz DEFAULT now(),
  was_on_time     boolean DEFAULT true
);

ALTER TABLE job_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions_public_read"   ON job_completions FOR SELECT USING (true);
CREATE POLICY "completions_service_write" ON job_completions FOR ALL USING (true);

-- Worker misconduct flags
CREATE TABLE IF NOT EXISTS worker_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   uuid NOT NULL REFERENCES worker_profiles(id),
  job_id      uuid REFERENCES jobs(id),
  flagged_by  text NOT NULL,
  reason      text NOT NULL,
  severity    text DEFAULT 'low' CHECK (severity IN ('low','medium','high','ban')),
  resolved    boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE worker_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_service_all" ON worker_flags FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS jobs_status_created_idx      ON jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_category_idx            ON jobs(category);
CREATE INDEX IF NOT EXISTS job_apps_job_idx             ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS job_apps_worker_idx          ON job_applications(worker_id);
CREATE INDEX IF NOT EXISTS worker_rep_score_idx         ON worker_reputations(reputation_score DESC);
CREATE INDEX IF NOT EXISTS worker_profiles_banned_idx   ON worker_profiles(is_banned);
CREATE INDEX IF NOT EXISTS worker_profiles_skills_idx   ON worker_profiles USING GIN(skills);
