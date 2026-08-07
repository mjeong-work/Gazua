-- ================================================================
-- Gazua — profiles.creator_risk_style
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- Decision (creator profile phase, Priority 3): the brief requires a
-- creator-facing investing risk style shown on their public profile.
-- onboarding_risk_style already exists on this same table, but it
-- represents a *viewer's own* onboarding preference (set via
-- OnboardingContext.tsx during signup, read back by userActivity.ts for
-- admin analytics on that user) — it is never read by
-- CreatorProfileInvestment.tsx / CreatorProfileVideos.tsx today, and
-- reusing it for creators would conflate two different concepts on one
-- column. This adds a separate, dedicated column instead of repurposing
-- onboarding_risk_style.
--
-- Same 4-value vocabulary as onboarding_risk_style (RiskStyle in
-- src/types/database.ts) for consistency, but intentionally a distinct
-- column: nullable, no default — "not yet selected" is a real, valid,
-- and expected state (most creators won't have set this at launch), not
-- an error condition, so no fallback value should ever be synthesized
-- client-side (see CreatorProfileInvestment.tsx / CreatorProfileVideos.tsx,
-- which must render an explicit "not shared" state for null rather than
-- guessing).
--
-- No admin-only guard (unlike credibility_level/is_verified in
-- 20260805000000_credibility_level.sql): this is the creator's own
-- self-reported investing style, analogous to bio or portfolio_allocation,
-- so the existing "profiles: update own" policy (auth.uid() = id) already
-- covers it correctly — a creator should be able to set/change their own
-- risk style without admin intervention.
-- ================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creator_risk_style text
  CHECK (creator_risk_style = ANY (ARRAY['conservative', 'balanced', 'aggressive', 'speculative']));

CREATE INDEX IF NOT EXISTS idx_profiles_creator_risk_style ON public.profiles (creator_risk_style)
  WHERE (creator_risk_style IS NOT NULL);
