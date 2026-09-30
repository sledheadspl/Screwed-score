-- ── Academy Community ────────────────────────────────────────────────────────
-- Discussion feed for ScrewedScore Academy: students (and anyone browsing)
-- can post a question, a win, or a tip against a specific course (or general
-- discussion), upvote posts, and reply. Mirrors the existing `experiences`
-- table's RLS pattern (public read, anon insert, public update for upvotes)
-- and the `increment_upvotes` atomic-upvote pattern from migration 005.

CREATE TABLE IF NOT EXISTS academy_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   text NOT NULL DEFAULT 'general'
              CHECK (course_id IN (
                'general',
                'academy-estimate-mastery',
                'academy-check-engine',
                'academy-noise-diagnosis',
                'academy-fight-back'
              )),
  post_type   text NOT NULL DEFAULT 'question' CHECK (post_type IN ('question', 'win', 'tip')),
  author_name text NOT NULL DEFAULT 'Anonymous',
  body        text NOT NULL,
  upvotes     integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE academy_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_posts_public_read" ON academy_posts FOR SELECT USING (true);
CREATE POLICY "academy_posts_anon_insert" ON academy_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "academy_posts_upvote"      ON academy_posts FOR UPDATE USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS academy_posts_course_idx  ON academy_posts (course_id);
CREATE INDEX IF NOT EXISTS academy_posts_created_idx ON academy_posts (created_at DESC);

-- ── Replies ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academy_post_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES academy_posts(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Anonymous',
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE academy_post_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academy_post_replies_public_read" ON academy_post_replies FOR SELECT USING (true);
CREATE POLICY "academy_post_replies_anon_insert" ON academy_post_replies FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS academy_post_replies_post_idx ON academy_post_replies (post_id);

-- ── Atomic upvote increment (prevents read-modify-write race condition) ───────
CREATE OR REPLACE FUNCTION increment_academy_post_upvotes(post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE academy_posts
  SET upvotes = upvotes + 1
  WHERE id = post_id;
$$;

-- ── Reply-count helper view (avoids an N+1 count query per post in the feed) ──
CREATE OR REPLACE VIEW academy_posts_with_reply_count AS
  SELECT p.*, COALESCE(r.reply_count, 0) AS reply_count
  FROM academy_posts p
  LEFT JOIN (
    SELECT post_id, COUNT(*) AS reply_count
    FROM academy_post_replies
    GROUP BY post_id
  ) r ON r.post_id = p.id;
