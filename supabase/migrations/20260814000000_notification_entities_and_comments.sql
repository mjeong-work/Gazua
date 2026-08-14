-- ================================================================
-- Gazua — notification click-through + comment notifications
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- Two things, landing together since the second needs the first:
--
-- 1. notifications gains entity_type/entity_id/entity_ticker so a notification can point at
--    the thing it's about. notify_followers_of_new_content() already branched on
--    TG_TABLE_NAME to build the title text and then threw NEW.id away — it now keeps it.
--
-- 2. Two new triggers, scoped per this session's product decision:
--      - post_comments / reel_comments INSERT -> notify the post/reel/video's author
--        (type='comment'). Always fires, 1:1, no fan-out.
--      - posts / reels INSERT -> ALSO notify users who have a matching ticker in their
--        watchlist (type='watchlist_post'), not just followers. New-content-only, same
--        low-frequency shape as the existing follower fan-out — explicitly NOT a
--        per-comment fan-out, which would fire far too often (discussed and rejected).
--        A user who both follows the creator AND watches the ticker gets one notification,
--        not two — the watchlist fan-out excludes anyone already reached via follows.
-- ================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS entity_ticker text;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['creator_post', 'watchlist_post', 'comment', 'price_alert', 'model_update', 'system']));

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_entity_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_entity_type_check
  CHECK (entity_type IS NULL OR entity_type = ANY (ARRAY['post', 'reel', 'video', 'asset']));

CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications (entity_type, entity_id);

-- ── notify_followers_of_new_content(): now also fans out to watchlist holders ─────
CREATE OR REPLACE FUNCTION public.notify_followers_of_new_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DECLARE
    creator_name  text;
    content_noun  text;
    notif_title   text;
    notif_message text;
    v_entity_type text;
    v_tickers     text[];
  BEGIN
    SELECT COALESCE(NULLIF(full_name, ''), username)
      INTO creator_name
      FROM public.profiles
      WHERE id = NEW.creator_id;

    IF TG_TABLE_NAME = 'reels' THEN
      content_noun  := 'a new reel';
      notif_message := NEW.caption;
      v_entity_type := 'reel';
      v_tickers     := NEW.tickers;
    ELSIF TG_TABLE_NAME = 'videos' THEN
      content_noun  := 'a new video';
      notif_message := NEW.title;
      v_entity_type := 'video';
      v_tickers     := NULL; -- videos aren't ticker-tagged, no watchlist fan-out for these
    ELSE
      content_noun  := 'a new post';
      notif_message := NEW.content;
      v_entity_type := 'post';
      v_tickers     := ARRAY[NEW.asset];
    END IF;

    notif_title := COALESCE(creator_name, 'A creator you follow') || ' shared ' || content_noun;

    -- Followers (unchanged fan-out, now carrying entity_type/entity_id for click-through)
    INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
    SELECT follower_id, 'creator_post', notif_title, left(notif_message, 200), v_entity_type, NEW.id
    FROM public.follows
    WHERE creator_id = NEW.creator_id;

    -- Watchlist holders for a tagged ticker — new content only, excludes anyone already
    -- notified above via follows, and never the creator notifying themselves.
    IF v_tickers IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, entity_ticker)
      SELECT DISTINCT w.user_id,
             'watchlist_post',
             COALESCE(creator_name, 'Someone') || ' shared ' || content_noun || ' about $' || w.ticker,
             left(notif_message, 200),
             v_entity_type,
             NEW.id,
             w.ticker
      FROM public.watchlist_items w
      WHERE w.ticker = ANY (v_tickers)
        AND w.user_id <> NEW.creator_id
        AND NOT EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.creator_id = NEW.creator_id AND f.follower_id = w.user_id
        );
    END IF;

    RETURN NEW;
  END;
  $function$;

-- ── notify_on_comment(): post/reel/video author gets notified, no fan-out ─────────
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DECLARE
    v_author_id   uuid;
    v_entity_type text;
    commenter_name text;
  BEGIN
    IF TG_TABLE_NAME = 'post_comments' THEN
      SELECT creator_id INTO v_author_id FROM public.posts WHERE id = NEW.post_id;
      v_entity_type := 'post';
    ELSIF NEW.content_type = 'video' THEN
      SELECT creator_id INTO v_author_id FROM public.videos WHERE id = NEW.content_id;
      v_entity_type := 'video';
    ELSE
      SELECT creator_id INTO v_author_id FROM public.reels WHERE id = NEW.content_id;
      v_entity_type := 'reel';
    END IF;

    -- No author found (content since deleted) or commenting on your own content — no notification.
    IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(NULLIF(full_name, ''), username) INTO commenter_name
      FROM public.profiles WHERE id = NEW.user_id;

    INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id)
    VALUES (
      v_author_id,
      'comment',
      COALESCE(commenter_name, 'Someone') || ' commented on your ' || v_entity_type,
      left(NEW.content, 200),
      v_entity_type,
      CASE WHEN TG_TABLE_NAME = 'post_comments' THEN NEW.post_id ELSE NEW.content_id END
    );

    RETURN NEW;
  END;
  $function$;

CREATE TRIGGER on_post_comment_created AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

CREATE TRIGGER on_reel_comment_created AFTER INSERT ON public.reel_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();
