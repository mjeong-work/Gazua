-- ================================================================
-- Gazua — In-app feedback / bug reports
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- Beta-readiness item: up to now a beta tester who hit a bug had no way to
-- tell us about it short of texting/emailing someone directly. This is
-- deliberately separate from content_reports — that table is for reporting
-- OTHER users' content/accounts for moderation; this is a user reporting a
-- problem with the app itself back to the team. Reuses public.is_admin()
-- from 20260711000000_admin_roles_and_moderation.sql.
-- ================================================================

CREATE TABLE public.feedback (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message    text        NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  page_url   text,
  status     text        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_status_idx     ON public.feedback (status);
CREATE INDEX feedback_created_at_idx ON public.feedback (created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can submit feedback, only ever attributed to themselves.
CREATE POLICY "Users insert own feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- A user can read back what they've submitted; admins can read all of it (triage queue).
CREATE POLICY "Feedback readable by admin or author" ON public.feedback
  FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- Only admins move status through the triage states.
CREATE POLICY "Admins update feedback status" ON public.feedback
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
