-- Fix: handle_new_user() could build a username longer than the 30-char
-- limit enforced by profiles_username_check ('^[a-z0-9_-]{3,30}$'), since
-- the email-local-part-derived base_username was never capped before
-- appending "_" + 6 hex chars. Any real user whose email local part was
-- long enough got a hard 500 "Database error saving new user" on signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DECLARE
    base_username  text;
    uid_suffix     text;
    final_username text;
  BEGIN
    -- Strip non-alphanumeric characters from email local part
    base_username := lower(
      regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g')
    );

    -- Ensure minimum length
    IF length(base_username) < 3 THEN
      base_username := base_username || 'user';
    END IF;

    -- Cap so "{base}_{6 hex}" never exceeds the 30-char username limit
    base_username := left(base_username, 23);

    -- Append 6 hex chars from UUID — near-guaranteed uniqueness
    uid_suffix     := left(replace(NEW.id::text, '-', ''), 6);
    final_username := base_username || '_' || uid_suffix;

    INSERT INTO public.profiles (
      id,
      full_name,
      avatar_url,
      username
    )
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',   -- Google OAuth
        NEW.raw_user_meta_data->>'name',        -- some OAuth providers
        split_part(NEW.email, '@', 1)           -- email/password fallback
      ),
      NEW.raw_user_meta_data->>'avatar_url',    -- Google OAuth profile picture
      final_username
    );

    RETURN NEW;
  END;
  $function$;
