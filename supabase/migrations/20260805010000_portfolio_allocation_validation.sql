-- ================================================================
-- Gazua — Enforce portfolio_allocation's "slices sum to 100" invariant
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- src/types/database.ts's AllocationSlice has always documented this
-- invariant ("all slices must sum to 100") but nothing in the schema
-- enforced it — profiles.portfolio_allocation is read-only in the app today
-- (CreatorProfileInvestment.tsx renders it as a pie chart; there is no write
-- path yet), so this has been harmless so far, but any future "creator edits
-- their own allocation" feature needs this already in place rather than
-- retrofitted after bad data exists.
--
-- CAUTION before applying: this ALTER TABLE validates every existing row.
-- No migration in this repo's history sets portfolio_allocation (grep
-- confirms only the column declaration in 20260715100000), so on a database
-- whose only writes came from this repo's migrations, every row is NULL and
-- this is a no-op. If rows were populated by hand (Dashboard) or by tooling
-- outside this repo, run the SELECT below first — if it returns any rows,
-- fix or null out portfolio_allocation on them before applying this file,
-- or the ALTER TABLE will fail:
--
--   SELECT id, portfolio_allocation FROM public.profiles
--   WHERE portfolio_allocation IS NOT NULL
--     AND NOT public.validate_portfolio_allocation(portfolio_allocation);
--   -- (run after the CREATE FUNCTION below, before the ALTER TABLE)
-- ================================================================

CREATE OR REPLACE FUNCTION public.validate_portfolio_allocation(allocation jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT allocation IS NULL OR (
    jsonb_typeof(allocation) = 'array'
    AND jsonb_array_length(allocation) > 0
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(allocation) elem
      WHERE jsonb_typeof(elem->'value') <> 'number'
         OR jsonb_typeof(elem->'name') <> 'string'
    )
    AND (
      SELECT COALESCE(SUM((elem->>'value')::numeric), 0)
      FROM jsonb_array_elements(allocation) elem
    ) = 100
  );
$$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_portfolio_allocation_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_portfolio_allocation_valid
  CHECK (public.validate_portfolio_allocation(portfolio_allocation));
