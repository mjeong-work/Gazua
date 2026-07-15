-- ── post_comments ────────────────────────────────────────────────
CREATE TABLE post_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX post_comments_post_id_idx ON post_comments(post_id, created_at);
CREATE INDEX post_comments_user_id_idx ON post_comments(user_id);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "post_comments_select_public"
  ON post_comments FOR SELECT
  USING (true);

-- Authenticated users can insert their own comments
CREATE POLICY "post_comments_insert_own"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "post_comments_delete_own"
  ON post_comments FOR DELETE
  USING (auth.uid() = user_id);
