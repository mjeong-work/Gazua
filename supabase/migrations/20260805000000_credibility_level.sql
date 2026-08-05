-- ================================================================
-- Gazua Credibility System — profiles.credibility_level
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- Decision (see project audit remediation, Issue 5): credibility_level is a
-- 5-stage trust/expertise ladder, entirely separate from subscription_tier
-- (billing — untouched by this migration). is_verified is redefined in
-- meaning only (not schema): it now represents "identity/portfolio
-- due-diligence completed", an internal ops flag that no longer drives the
-- "verified" badge on its own — the badge is credibility_level = 'verified_pro'
-- only (see Issue 1, already shipped against the TS type ahead of this
-- migration).
--
-- Both columns are admin/ops-only writes. The existing "profiles: update own"
-- policy (auth.uid() = id, no column restriction) predates this migration and
-- already lets a user update any column on their own row — including
-- is_verified, which was already true before credibility_level existed. This
-- migration does not widen that; it adds a trigger so BOTH privileged columns
-- (the pre-existing is_verified and the new credibility_level) require
-- is_admin(), closing that gap rather than reproducing it on the new column.
-- ================================================================

-- ── profiles: credibility_level ─────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credibility_level text NOT NULL DEFAULT 'explorer'
  CHECK (credibility_level IN ('explorer', 'contributor', 'analyst', 'educator', 'verified_pro'));

CREATE INDEX IF NOT EXISTS profiles_credibility_level_idx ON public.profiles (credibility_level);

-- ── Guard: only admins may change credibility_level or is_verified ──────
-- auth.uid() reflects the calling user's JWT regardless of whether the
-- UPDATE runs directly (client, RLS context) or inside a SECURITY DEFINER
-- RPC like admin_set_credibility_level below, so this trigger protects both
-- paths uniformly.
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.credibility_level IS DISTINCT FROM OLD.credibility_level
      OR NEW.is_verified IS DISTINCT FROM OLD.is_verified)
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'credibility_level and is_verified can only be changed by an admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_privileged_profile_columns_trg ON public.profiles;
CREATE TRIGGER protect_privileged_profile_columns_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_privileged_profile_columns();

-- ── admin_set_credibility_level() ────────────────────────────────────
-- Narrow, single-purpose write RPC — same convention as admin_set_user_status
-- / admin_set_content_moderation_status in 20260711000000_admin_roles_and_moderation.sql.
CREATE OR REPLACE FUNCTION public.admin_set_credibility_level(
  p_user_id uuid,
  p_level text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_level NOT IN ('explorer', 'contributor', 'analyst', 'educator', 'verified_pro') THEN
    RAISE EXCEPTION 'invalid credibility_level: %', p_level;
  END IF;

  UPDATE public.profiles
  SET credibility_level = p_level
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_credibility_level(uuid, text) TO authenticated;
