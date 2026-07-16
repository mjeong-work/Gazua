-- ================================================================
-- follows RLS policy cleanup
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- The live `follows` table had two overlapping sets of RLS
-- policies: the clean ones captured in
-- 20260715100000_baseline_schema_snapshot.sql ("follows: public
-- read" / "follows: authenticated insert" / "follows: authenticated
-- delete"), plus a second, redundant set with malformed
-- (CRLF-embedded) names from an earlier setup attempt
-- ("Authenticated users can ... follow", "Follows are publicly ...
-- readable", "Users can unfollow"). Both sets enforced the same
-- rules, so this was harmless but confusing. Drops anything on
-- `follows` that isn't one of the three canonical policies.
-- ================================================================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'follows'
      AND policyname NOT IN (
        'follows: public read',
        'follows: authenticated insert',
        'follows: authenticated delete'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.follows', pol.policyname);
  END LOOP;
END $$;
