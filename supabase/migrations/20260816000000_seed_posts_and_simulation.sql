-- ================================================================
-- Gazua — Seed Posts + one Portfolio Simulation
--
-- PURPOSE:
--   The main feed and every creator's Posts tab read live from
--   public.posts. Creator profiles were seeded (20260527000002)
--   but posts never were, so with real posts genuinely absent the
--   UI correctly renders its "No posts yet" empty states — which
--   makes the live app impossible to demo/evaluate. This mirrors
--   20260716030000_seed_reels_and_videos.sql's approach: insert the
--   old MOCK_POSTS content as real rows against the existing seeded
--   creator profiles.
--
--   Also seeds one public.simulations row for Alex Rodriguez (the
--   default creator profile) so the Portfolio Simulator on his
--   public profile has a real simulation to show instead of the
--   "hasn't run any simulations yet" empty state — content mirrors
--   MOCK_SIMULATIONS' "NVDA & TSLA Portfolio" (src/app/data/simulations.ts).
--
-- HOW TO APPLY:
--   Supabase Dashboard → SQL Editor → paste & run, OR
--   supabase db push (requires supabase CLI)
--
-- NOTES:
--   • Fixed UUID prefix d0000001-… for posts (matches the b/c prefix
--     convention reels/videos seeding already used). ON CONFLICT
--     makes the script idempotent.
--   • like_count/comment_count are NOT stored on posts — they're
--     computed live from post_likes / post_comments, which this
--     migration deliberately leaves unseeded (no real users exist
--     yet to attribute likes/comments to). Posts show 0 engagement
--     until real users interact — that's correct, not a bug.
--   • Portfolio Simulator holdings are stored as camelCase JSON keys
--     (symbol/amount/expectedReturnPercent/entryPrice) — that's what
--     simulations.service.ts's parseHoldings() actually reads, even
--     though this table's own creation comment describes snake_case.
-- ================================================================

INSERT INTO public.posts (
  id, creator_id, asset, category, content, tags,
  sentiment, time_horizon, risk_level, confidence,
  share_count, created_at, updated_at
) VALUES
  (
    'd0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000002', -- sarah-chen
    'NVDA', 'Stocks',
    E'It''s really encouraging to feel like you''re a part of something great. The AI semiconductor sector continues to show massive growth potential.',
    ARRAY['#AI', '#semiconductors', '#NVDA'],
    'Bullish', 'Medium-term', 'Medium', 'High',
    12, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'
  ),
  (
    'd0000001-0000-0000-0000-000000000002',
    'a0000001-0000-0000-0000-000000000003', -- mike-ross
    'TSLA', 'Stocks',
    'We stopped out the sort of company that wanted to build; one thing to watch going forward is EV adoption rates in emerging markets.',
    ARRAY['#EV', '#Tesla', '#TSLA'],
    'Bearish', 'Short-term', 'High', 'Medium',
    23, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'
  ),
  (
    'd0000001-0000-0000-0000-000000000003',
    'a0000001-0000-0000-0000-000000000004', -- emma-wilson
    'BTC', 'Crypto',
    'As crypto standard means that anyone and everyone can invest in digital assets. Important to understand the fundamentals before jumping in.',
    ARRAY['#crypto', '#bitcoin', '#BTC'],
    'Neutral', 'Long-term', 'High', 'Medium',
    34, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'
  ),
  (
    'd0000001-0000-0000-0000-000000000004',
    'a0000001-0000-0000-0000-000000000005', -- david-park
    'SPY', 'ETFs',
    E'No one knows everything. No one knows nothing. Everyone has a piece of wisdom to share. That''s what makes index investing so powerful.',
    ARRAY['#indexfunds', '#SPY', '#passive'],
    'Bullish', 'Long-term', 'Low', 'High',
    45, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'
  ),
  (
    'd0000001-0000-0000-0000-000000000005',
    'a0000001-0000-0000-0000-000000000006', -- lisa-zhang
    'VTI', 'ETFs',
    'For long-term wealth building, low-cost index funds remain undefeated. Time in the market beats timing the market.',
    ARRAY['#ETF', '#VTI', '#passive'],
    'Bullish', 'Long-term', 'Low', 'High',
    67, NOW() - INTERVAL '7 hours', NOW() - INTERVAL '7 hours'
  ),
  (
    'd0000001-0000-0000-0000-000000000006',
    'a0000001-0000-0000-0000-000000000007', -- james-lee
    'ETH', 'Crypto',
    E'Ethereum''s transition to proof-of-stake was a game changer. The energy efficiency improvements are substantial.',
    ARRAY['#ETH', '#ethereum', '#crypto'],
    'Bullish', 'Long-term', 'High', 'Medium',
    29, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours'
  ),
  (
    'd0000001-0000-0000-0000-000000000007',
    'a0000001-0000-0000-0000-000000000008', -- anna-martinez
    'IRA', 'Retirement',
    'Starting your retirement savings early compounds over time. Even small contributions make a huge difference in 30 years.',
    ARRAY['#retirement', '#IRA', '#savings'],
    'Bullish', 'Long-term', 'Low', 'High',
    41, NOW() - INTERVAL '9 hours', NOW() - INTERVAL '9 hours'
  ),
  (
    'd0000001-0000-0000-0000-000000000008',
    'a0000001-0000-0000-0000-000000000009', -- robert-kim
    'GOLD', 'Commodities',
    'Gold continues to serve as a hedge against inflation. Diversification across asset classes is key to risk management.',
    ARRAY['#gold', '#commodities', '#hedge'],
    'Bullish', 'Medium-term', 'Low', 'Medium',
    33, NOW() - INTERVAL '10 hours', NOW() - INTERVAL '10 hours'
  ),
  (
    'd0000001-0000-0000-0000-000000000009',
    'a0000001-0000-0000-0000-000000000010', -- sophie-turner
    'QQQ', 'ETFs',
    E'Tech-heavy ETFs have shown strong performance, but remember to balance your portfolio. Don''t put all eggs in one basket.',
    ARRAY['#tech', '#QQQ', '#ETF'],
    'Neutral', 'Medium-term', 'Medium', 'Medium',
    44, NOW() - INTERVAL '11 hours', NOW() - INTERVAL '11 hours'
  ),
  (
    'd0000001-0000-0000-0000-000000000010',
    'a0000001-0000-0000-0000-000000000011', -- marcus-johnson
    '101', 'Beginner Basics',
    'New to investing? Start with understanding the difference between stocks and bonds. Knowledge is your best investment.',
    ARRAY['#beginner', '#investing101', '#education'],
    'Neutral', 'Long-term', 'Low', 'High',
    78, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'
  )
ON CONFLICT (id) DO UPDATE SET
  asset         = EXCLUDED.asset,
  category      = EXCLUDED.category,
  content       = EXCLUDED.content,
  tags          = EXCLUDED.tags,
  sentiment     = EXCLUDED.sentiment,
  time_horizon  = EXCLUDED.time_horizon,
  risk_level    = EXCLUDED.risk_level,
  confidence    = EXCLUDED.confidence,
  share_count   = EXCLUDED.share_count,
  updated_at    = NOW();

-- ── One Portfolio Simulation for Alex Rodriguez ───────────────────
-- Mirrors MOCK_SIMULATIONS' "NVDA & TSLA Portfolio" (src/app/data/simulations.ts).
-- entryPrice is a plausible illustrative value, not a real historical quote — "actual"
-- performance only renders once a live quote is configured/available for every holding;
-- without one, SimulationsPanel correctly shows "Live pricing unavailable" rather than a
-- fabricated number.
INSERT INTO public.simulations (
  id, user_id, name, start_date, end_date, capital, holdings, rationale, created_at, updated_at
) VALUES (
  'e0000001-0000-0000-0000-000000000001',
  'a0000001-0000-0000-0000-000000000001', -- alex-rodriguez
  'NVDA & TSLA Portfolio',
  '2026-04-01', NULL, 50000,
  '[
    {"symbol": "NVDA", "amount": 30000, "expectedReturnPercent": 25, "entryPrice": 120.50},
    {"symbol": "TSLA", "amount": 15000, "expectedReturnPercent": 10, "entryPrice": 248.75}
  ]'::jsonb,
  'Betting on continued AI infrastructure spend carrying NVDA, with TSLA as a smaller, higher-risk EV adoption play.',
  NOW() - INTERVAL '5 months', NOW() - INTERVAL '5 months'
)
ON CONFLICT (id) DO UPDATE SET
  name       = EXCLUDED.name,
  start_date = EXCLUDED.start_date,
  capital    = EXCLUDED.capital,
  holdings   = EXCLUDED.holdings,
  rationale  = EXCLUDED.rationale,
  updated_at = NOW();
