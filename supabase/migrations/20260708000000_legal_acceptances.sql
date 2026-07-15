-- ================================================================
-- Gazua Legal Acceptance Tracking — Migration
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- Document content/version metadata lives in src/content/legal/**/*.md
-- (git-managed markdown, see src/lib/legal/registry.ts) — not mirrored
-- into the database. This table only records the immutable fact that a
-- user accepted a given document_slug/document_version at a point in
-- time; it intentionally has no FK to a documents table, matching the
-- existing content_reports.content_id bare-text precedent.
-- ================================================================

-- ── user_legal_acceptances ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_legal_acceptances (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  document_slug     text        NOT NULL,
  document_version  text        NOT NULL,
  jurisdiction      text        NOT NULL DEFAULT 'US',
  locale            text        NOT NULL DEFAULT 'en',
  ip_address        text,
  accepted_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS user_legal_acceptances_user_id_idx       ON public.user_legal_acceptances (user_id);
CREATE INDEX IF NOT EXISTS user_legal_acceptances_document_slug_idx ON public.user_legal_acceptances (document_slug);

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE public.user_legal_acceptances ENABLE ROW LEVEL SECURITY;

-- users manage only their own acceptance rows (no broad admin read policy
-- yet — add one with an is_admin check, matching the moderation_actions
-- MVP precedent, if/when an admin legal-audit screen is built)
CREATE POLICY "Users insert own legal acceptances" ON public.user_legal_acceptances
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own legal acceptances" ON public.user_legal_acceptances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
