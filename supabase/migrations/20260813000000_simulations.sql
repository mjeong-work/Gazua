-- ================================================================
-- Gazua — public.simulations
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push
--
-- Portfolio Simulator (myProfile/InvestmentTab.tsx's "New Simulation" form, and the read-only
-- view on a creator's public profile — CreatorProfileInvestment.tsx) has been entirely backed by
-- MOCK_SIMULATIONS / local useState since it was built: no table existed to persist a
-- simulation a real user creates, so it evaporated on refresh. This is that table.
--
-- Deliberately does NOT store hypothesis_percent / actual_percent / a fabricated daily chart —
-- those were previously hardcoded numbers (hypothesis) or a Math.random() walk (the chart),
-- which is exactly the kind of synthesized-fake-data this codebase's own convention elsewhere
-- (parseAllocation, portfolio_allocation, etc.) explicitly avoids. Both are computed at read
-- time instead:
--   - hypothesis %  = capital-weighted average of each holding's own expected_return_percent
--                     (the user's own stated prediction — no market data needed)
--   - actual %      = capital-weighted average of (current live price - entry_price) / entry_price
--                     per holding, using real quotes (src/lib/market.service.ts). entry_price is
--                     captured once, at creation time, and stored in the holdings jsonb.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  capital numeric NOT NULL CHECK (capital > 0),
  -- [{ symbol: text, amount: numeric, expected_return_percent: numeric, entry_price: numeric | null }]
  -- entry_price is null when live market data wasn't available at creation time (no API key
  -- configured, or the quote fetch failed) — actual % is left unavailable for that holding
  -- rather than guessed.
  holdings jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON public.simulations (user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_user_created ON public.simulations (user_id, created_at DESC);

CREATE TRIGGER simulations_updated_at BEFORE UPDATE ON public.simulations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

-- Public read — a creator's simulations are shown on their public profile
-- (CreatorProfileInvestment.tsx), same "public read" pattern as posts/portfolio_allocation.
CREATE POLICY "simulations: public read" ON public.simulations
  FOR SELECT USING (true);

CREATE POLICY "simulations: owner insert" ON public.simulations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simulations: owner update" ON public.simulations
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simulations: owner delete" ON public.simulations
  FOR DELETE USING (auth.uid() = user_id);
