-- ================================================================
-- Gazua Admin Section — Roles, Moderation Status & Secure Writes
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- IMPORTANT: `profiles`, `posts`, `reels`, `videos`, and `post_comments` were
-- created outside this repo's migration history (no CREATE TABLE for them
-- exists in supabase/migrations/), so their current RLS enable-state and
-- existing policies are unknown from this sandbox. This migration therefore
-- only ADDS columns and ADDITIVE policies to those five tables — nothing is
-- dropped or replaced on them, so no existing access can be reduced. It DOES
-- drop-and-replace policies on compliance_reviews/content_reports/
-- moderation_actions/compliance_audit_logs, since those were created by
-- 20260526000000_compliance.sql in this same repo and their exact prior
-- definitions are known.
--
-- After applying, at least one profiles row must be set to role = 'admin'
-- manually (Dashboard > Table Editor) — there is no in-app or RPC path that
-- can ever grant admin, by design.
-- ================================================================

-- ── profiles: role & status ────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'warned', 'suspended'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_reason text;

CREATE INDEX IF NOT EXISTS profiles_role_idx   ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles (status);

-- ── is_admin() ────────────────────────────────────────────────────
-- SECURITY DEFINER so RLS policies that call this on `profiles` itself don't
-- recurse (a normal, non-definer query would re-trigger the same RLS check).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── moderation_status on content tables ────────────────────────────
-- Reversible remove/restore. Default 'visible' preserves all existing rows'
-- current behavior exactly.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible'
  CHECK (moderation_status IN ('visible', 'removed'));
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible'
  CHECK (moderation_status IN ('visible', 'removed'));
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible'
  CHECK (moderation_status IN ('visible', 'removed'));
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'visible'
  CHECK (moderation_status IN ('visible', 'removed'));

CREATE INDEX IF NOT EXISTS posts_moderation_status_idx         ON public.posts (moderation_status);
CREATE INDEX IF NOT EXISTS reels_moderation_status_idx         ON public.reels (moderation_status);
CREATE INDEX IF NOT EXISTS videos_moderation_status_idx        ON public.videos (moderation_status);
CREATE INDEX IF NOT EXISTS post_comments_moderation_status_idx ON public.post_comments (moderation_status);

-- ── Broaden content_reports / moderation_actions enums ─────────────
-- Original CHECKs only covered ('post','reel'). The admin section needs to
-- report/act on videos, comments, and creator profiles too, and
-- moderation_actions needs a 'user' content_type for direct warn/suspend/
-- reinstate actions that aren't tied to a specific piece of content.
ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_content_type_check;
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_content_type_check
  CHECK (content_type IN ('post', 'reel', 'video', 'comment', 'creator_profile'));

ALTER TABLE public.moderation_actions DROP CONSTRAINT IF EXISTS moderation_actions_content_type_check;
ALTER TABLE public.moderation_actions ADD CONSTRAINT moderation_actions_content_type_check
  CHECK (content_type IN ('post', 'reel', 'video', 'comment', 'creator_profile', 'user'));

ALTER TABLE public.moderation_actions DROP CONSTRAINT IF EXISTS moderation_actions_action_check;
ALTER TABLE public.moderation_actions ADD CONSTRAINT moderation_actions_action_check
  CHECK (action IN (
    'dismissed', 'warning_sent', 'content_removed', 'user_suspended',
    'content_restored', 'user_reinstated'
  ));

-- ── Narrow, single-purpose write RPCs ───────────────────────────────
-- Deliberately NOT exposed via broad RLS UPDATE policies: a blanket "admins
-- can update profiles/posts/reels/videos/post_comments" policy would let any
-- admin-authorized client write ANY column on those tables, not just the
-- moderation-relevant ones. These two functions check is_admin() internally
-- and touch only the specific fields each action is meant to touch, so the
-- browser client never needs (and never gets) general write access to these
-- tables for admin purposes.
CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
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
  IF p_status NOT IN ('active', 'warned', 'suspended') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  UPDATE public.profiles
  SET
    status = p_status,
    suspended_at = CASE WHEN p_status = 'suspended' THEN now() ELSE NULL END,
    suspended_reason = CASE WHEN p_status = 'suspended' THEN p_reason ELSE NULL END
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_content_moderation_status(
  p_content_type text,
  p_content_id uuid,
  p_status text
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
  IF p_status NOT IN ('visible', 'removed') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  IF p_content_type = 'post' THEN
    UPDATE public.posts SET moderation_status = p_status WHERE id = p_content_id;
  ELSIF p_content_type = 'reel' THEN
    UPDATE public.reels SET moderation_status = p_status WHERE id = p_content_id;
  ELSIF p_content_type = 'video' THEN
    UPDATE public.videos SET moderation_status = p_status WHERE id = p_content_id;
  ELSIF p_content_type = 'comment' THEN
    UPDATE public.post_comments SET moderation_status = p_status WHERE id = p_content_id;
  ELSE
    RAISE EXCEPTION 'unsupported content_type: %', p_content_type;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_content_moderation_status(text, uuid, text) TO authenticated;

-- ── Additive admin-read policies ────────────────────────────────────
-- Postgres RLS policies for the same command are OR'd together, so adding
-- these can only ever grant additional access — they cannot reduce whatever
-- access already exists on these five tables.
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins read all posts" ON public.posts
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins read all reels" ON public.reels
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins read all videos" ON public.videos
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins read all comments" ON public.post_comments
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── Harden compliance tables (fully controlled by this repo) ───────
-- 20260526000000_compliance.sql left these as `USING (true)` for any
-- authenticated user, explicitly flagged there as "MVP — add is_admin check
-- in production." This is that production hardening.
DROP POLICY IF EXISTS "Authenticated read reports" ON public.content_reports;
CREATE POLICY "Reports readable by admin or reporter" ON public.content_reports
  FOR SELECT TO authenticated
  USING (public.is_admin() OR reporter_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated update report status" ON public.content_reports;
CREATE POLICY "Admins update reports" ON public.content_reports
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated manage moderation actions" ON public.moderation_actions;
CREATE POLICY "Admins manage moderation actions" ON public.moderation_actions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users insert audit logs" ON public.compliance_audit_logs;
CREATE POLICY "Users insert own audit logs" ON public.compliance_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated read audit logs" ON public.compliance_audit_logs;
CREATE POLICY "Admins read audit logs" ON public.compliance_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- content_reports' INSERT policy ("Users insert reports", reporter_id =
-- auth.uid()) and compliance_reviews' policies are untouched — no change to
-- submitReport()/saveComplianceReview() callers.
