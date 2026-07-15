-- ================================================================
-- Gazua Saved Content — Migration
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- Replaces the temporary localStorage-only "Saved" tab
-- (src/lib/services/savedContent.service.ts) with a real, private,
-- per-user table. One row per saved reel/video/post.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.saved_content (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id    text        NOT NULL,   -- globally unique key, e.g. "home-reels:local-3"
  content_type  text        NOT NULL CHECK (content_type IN ('reel', 'video', 'post')),
  surface       text        NOT NULL CHECK (surface IN ('home-reels', 'creators-reels', 'video')),
  raw_id        text        NOT NULL,   -- original id within the source dataset
  title         text        NOT NULL,
  thumbnail     text        NOT NULL,
  creator_name  text        NOT NULL,
  creator_id    text,
  meta          text,
  saved_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_id)
);

CREATE INDEX IF NOT EXISTS saved_content_user_id_idx ON public.saved_content (user_id);

ALTER TABLE public.saved_content ENABLE ROW LEVEL SECURITY;

-- Fully private per-user data: a user can only ever see/insert/delete their own saves.
CREATE POLICY "Users manage own saved content" ON public.saved_content
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
