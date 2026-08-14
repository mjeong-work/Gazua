-- ================================================================
-- Gazua — fix notify_on_comment() (broken since 20260814000000)
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- notify_on_comment() is one function shared by both the post_comments and reel_comments
-- triggers. Its INSERT statement had a SQL-level `CASE WHEN TG_TABLE_NAME = 'post_comments'
-- THEN NEW.post_id ELSE NEW.content_id END`. post_comments has no content_id column — and
-- because that CASE is one SQL expression handed whole to the executor as part of the INSERT,
-- Postgres has to resolve every branch's field reference against NEW's actual row type up
-- front, even the branch that won't be taken. Every comment insert on post_comments has been
-- erroring since the previous migration landed (confirmed by reproducing it directly).
--
-- Fix: compute entity_id into a plain plpgsql variable via IF/ELSIF instead of an embedded SQL
-- CASE. plpgsql's own IF/ELSIF *is* evaluated branch-by-branch (unlike a SQL CASE inside one
-- executed statement), so a field that doesn't exist on the current NEW is never touched
-- outside the one branch where it's guaranteed to be valid.
-- ================================================================

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DECLARE
    v_author_id    uuid;
    v_entity_type  text;
    v_entity_id    uuid;
    commenter_name text;
  BEGIN
    IF TG_TABLE_NAME = 'post_comments' THEN
      v_entity_type := 'post';
      v_entity_id   := NEW.post_id;
      SELECT creator_id INTO v_author_id FROM public.posts WHERE id = v_entity_id;
    ELSIF NEW.content_type = 'video' THEN
      v_entity_type := 'video';
      v_entity_id   := NEW.content_id;
      SELECT creator_id INTO v_author_id FROM public.videos WHERE id = v_entity_id;
    ELSE
      v_entity_type := 'reel';
      v_entity_id   := NEW.content_id;
      SELECT creator_id INTO v_author_id FROM public.reels WHERE id = v_entity_id;
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
      v_entity_id
    );

    RETURN NEW;
  END;
  $function$;
