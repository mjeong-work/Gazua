-- ================================================================
-- Gazua Compliance Safety Layer — Migration
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
-- ================================================================

-- ── compliance_reviews ───────────────────────────────────────────
-- One row per submission attempt, including BLOCKED content.
-- The original_text column is the immutable audit record.
CREATE TABLE IF NOT EXISTS public.compliance_reviews (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  content_type         text        NOT NULL CHECK (content_type IN ('post', 'reel')),
  content_id           uuid,
  original_text        text        NOT NULL,
  tickers              text[]      NOT NULL DEFAULT '{}',
  risk_score           text        NOT NULL CHECK (risk_score IN ('LOW', 'MEDIUM', 'HIGH', 'BLOCKED')),
  risk_reasons         jsonb       NOT NULL DEFAULT '[]',
  disclosures_offered  text[]      NOT NULL DEFAULT '{}',
  disclosures_accepted text[]      NOT NULL DEFAULT '{}',
  warnings_shown       text[]      NOT NULL DEFAULT '{}',
  outcome              text        NOT NULL CHECK (outcome IN ('published', 'blocked', 'abandoned')),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ── content_reports ──────────────────────────────────────────────
-- User-submitted moderation flags.
CREATE TABLE IF NOT EXISTS public.content_reports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  content_type text        NOT NULL CHECK (content_type IN ('post', 'reel')),
  content_id   text        NOT NULL,
  reason       text        NOT NULL CHECK (reason IN (
                              'guaranteed_returns',
                              'coordinated_trading',
                              'buy_sell_instructions',
                              'undisclosed_promotion',
                              'fraud_allegation',
                              'other'
                            )),
  details      text,
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── moderation_actions ───────────────────────────────────────────
-- Admin actions taken in response to reports.
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  report_id    uuid        REFERENCES public.content_reports(id) ON DELETE CASCADE,
  content_type text        NOT NULL CHECK (content_type IN ('post', 'reel')),
  content_id   text        NOT NULL,
  action       text        NOT NULL CHECK (action IN (
                              'dismissed',
                              'warning_sent',
                              'content_removed',
                              'user_suspended'
                            )),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── compliance_audit_logs ────────────────────────────────────────
-- Immutable event log — INSERT only, never UPDATE or DELETE.
CREATE TABLE IF NOT EXISTS public.compliance_audit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   text        NOT NULL,
  user_id      uuid,
  content_type text,
  content_id   text,
  review_id    uuid        REFERENCES public.compliance_reviews(id),
  report_id    uuid        REFERENCES public.content_reports(id),
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS compliance_reviews_user_id_idx   ON public.compliance_reviews (user_id);
CREATE INDEX IF NOT EXISTS compliance_reviews_outcome_idx    ON public.compliance_reviews (outcome);
CREATE INDEX IF NOT EXISTS content_reports_status_idx        ON public.content_reports (status);
CREATE INDEX IF NOT EXISTS content_reports_content_id_idx    ON public.content_reports (content_id);
CREATE INDEX IF NOT EXISTS compliance_audit_logs_user_id_idx ON public.compliance_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS compliance_audit_logs_event_idx   ON public.compliance_audit_logs (event_type);

-- ── Row Level Security ────────────────────────────────────────────
ALTER TABLE public.compliance_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_logs ENABLE ROW LEVEL SECURITY;

-- compliance_reviews: users manage their own rows; admins read all
CREATE POLICY "Users insert own reviews" ON public.compliance_reviews
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own reviews" ON public.compliance_reviews
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- content_reports: any authenticated user can submit; all can read (for admin page)
CREATE POLICY "Users insert reports" ON public.content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Authenticated read reports" ON public.content_reports
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated update report status" ON public.content_reports
  FOR UPDATE TO authenticated
  USING (true);

-- moderation_actions: any authenticated user can manage (MVP — add is_admin check in production)
CREATE POLICY "Authenticated manage moderation actions" ON public.moderation_actions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- compliance_audit_logs: insert-only; all authenticated can read
CREATE POLICY "Users insert audit logs" ON public.compliance_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated read audit logs" ON public.compliance_audit_logs
  FOR SELECT TO authenticated
  USING (true);
