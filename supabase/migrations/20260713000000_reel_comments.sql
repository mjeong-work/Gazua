-- ── reel_comments ────────────────────────────────────────────────
-- Backs comments on both the Reels feed and Video watch page, which share the same
-- ReelEngagementActions/ReelEngagementBar UI and comment shape. No FK on content_id since it
-- polymorphically points at either reels(id) or videos(id) — same pattern already used by
-- watchlist_items.source_content_id.
CREATE TABLE reel_comments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type      text        NOT NULL DEFAULT 'reel' CHECK (content_type IN ('reel', 'video')),
  content_id        uuid        NOT NULL,
  user_id           uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content           text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  moderation_status text        NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'removed')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reel_comments_content_idx           ON reel_comments(content_type, content_id, created_at);
CREATE INDEX reel_comments_user_id_idx            ON reel_comments(user_id);
CREATE INDEX reel_comments_moderation_status_idx  ON reel_comments(moderation_status);

ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read visible comments
CREATE POLICY "reel_comments_select_public"
  ON reel_comments FOR SELECT
  USING (true);

-- Authenticated users can insert their own comments
CREATE POLICY "reel_comments_insert_own"
  ON reel_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "reel_comments_delete_own"
  ON reel_comments FOR DELETE
  USING (auth.uid() = user_id);
