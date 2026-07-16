-- Notifications had a read path (fetch/mark-read/realtime) but nothing
-- ever inserted a row, so the page was permanently empty for real users.
-- This wires up the `creator_post` notification type: when a creator
-- publishes a reel, video, or post, fan out a notification to everyone
-- who follows them. price_alert/model_update/system are left unwired —
-- no configuration UI exists for those yet.

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
  BEGIN
    SELECT COALESCE(NULLIF(full_name, ''), username)
      INTO creator_name
      FROM public.profiles
      WHERE id = NEW.creator_id;

    IF TG_TABLE_NAME = 'reels' THEN
      content_noun  := 'a new reel';
      notif_message := NEW.caption;
    ELSIF TG_TABLE_NAME = 'videos' THEN
      content_noun  := 'a new video';
      notif_message := NEW.title;
    ELSE
      content_noun  := 'a new post';
      notif_message := NEW.content;
    END IF;

    notif_title := COALESCE(creator_name, 'A creator you follow') || ' shared ' || content_noun;

    INSERT INTO public.notifications (user_id, type, title, message)
    SELECT follower_id, 'creator_post', notif_title, left(notif_message, 200)
    FROM public.follows
    WHERE creator_id = NEW.creator_id;

    RETURN NEW;
  END;
  $function$;

CREATE TRIGGER on_reel_created AFTER INSERT ON public.reels
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_of_new_content();

CREATE TRIGGER on_video_created AFTER INSERT ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_of_new_content();

CREATE TRIGGER on_post_created AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_followers_of_new_content();
