-- ================================================================
-- Gazua — Seed Creator Profiles + Ensure Follows RLS
--
-- PURPOSE:
--   The follows persistence system requires creator profiles to
--   exist in the profiles table with stable UUIDs. Without them,
--   all follow state falls back to local-only component state that
--   resets on every page refresh.
--
-- HOW TO APPLY:
--   Supabase Dashboard → SQL Editor → paste & run, OR
--   supabase db push (requires supabase CLI)
--
-- NOTES:
--   • session_replication_role = replica bypasses FK checks so we
--     can seed creator profiles without matching auth.users rows.
--   • All UUIDs use the fixed prefix a0000001-… making seeded
--     profiles easy to identify vs. real auth-user profiles.
--   • ON CONFLICT (id) DO UPDATE makes the script idempotent.
-- ================================================================

-- ── Step 1: bypass FK constraints for seeding ─────────────────────
SET session_replication_role = replica;

-- ── Step 2: upsert all mock creator profiles ─────────────────────
INSERT INTO public.profiles (
  id,
  username,
  handle,
  full_name,
  bio,
  focus,
  tagline,
  tags,
  is_creator,
  is_verified,
  featured_category,
  subscription_tier,
  onboarding_completed,
  created_at,
  updated_at
) VALUES
  -- ── Featured ────────────────────────────────────────────────────
  (
    'a0000001-0000-0000-0000-000000000001',
    'alex-rodriguez', 'alexrodriguez', 'Alex Rodriguez',
    'Investment educator helping everyday people build wealth through smart investing. 15+ years experience in portfolio management. Sharing real strategies, not get-rich-quick schemes. Not financial advice — always do your own research.',
    'Value Investing',
    'Helping everyday investors build wealth',
    ARRAY['Stocks','ETFs','Beginner'],
    true, true, 'featured', 'free', true, NOW(), NOW()
  ),
  (
    'a0000001-0000-0000-0000-000000000002',
    'sarah-chen', 'sarahchen', 'Sarah Chen',
    'Tech stock analyst and growth investor. Sharing deep dives on high-growth companies and emerging market trends. CFA charterholder.',
    'Growth Stocks',
    'Tech stock analysis and growth investing',
    ARRAY['Stocks','Tech','Analysis'],
    true, true, 'featured', 'free', true, NOW(), NOW()
  ),
  (
    'a0000001-0000-0000-0000-000000000003',
    'mike-ross', 'mikeross', 'Mike Ross',
    'Quant strategist and algorithmic trading specialist. Python, backtesting, and systematic market approaches. Former hedge fund analyst.',
    'Quant & Models',
    'Quant strategies and algorithmic trading',
    ARRAY['Python','Quant','Models'],
    true, true, 'featured', 'free', true, NOW(), NOW()
  ),

  -- ── Trending ─────────────────────────────────────────────────────
  (
    'a0000001-0000-0000-0000-000000000004',
    'emma-wilson', 'emmawilson', 'Emma Wilson',
    'Crypto fundamentals researcher and blockchain technology analyst. Education-first approach to digital assets.',
    'Crypto',
    'Crypto fundamentals and blockchain tech',
    ARRAY['Crypto','Bitcoin','Blockchain'],
    true, false, 'trending', 'free', true, NOW(), NOW()
  ),
  (
    'a0000001-0000-0000-0000-000000000005',
    'david-park', 'davidpark', 'David Park',
    'Passive investing advocate. Index funds, low costs, and long-term compounding. Making investing deliberately boring.',
    'Index Funds',
    'Passive index investing for beginners',
    ARRAY['Beginner','ETFs','Passive'],
    true, true, 'trending', 'free', true, NOW(), NOW()
  ),
  (
    'a0000001-0000-0000-0000-000000000006',
    'lisa-zhang', 'lisazhang', 'Lisa Zhang',
    'Options strategist and risk management educator. Teaching Greeks, spreads, and structured positions to serious traders.',
    'Options Trading',
    'Options strategies and risk management',
    ARRAY['Options','Strategy','Risk'],
    true, true, 'trending', 'free', true, NOW(), NOW()
  ),

  -- ── Beginner Educators ───────────────────────────────────────────
  (
    'a0000001-0000-0000-0000-000000000007',
    'james-lee', 'jameslee', 'James Lee',
    'Making investing simple for everyone. Plain-English guides from saving your first dollar to building a diversified portfolio.',
    'Beginner Education',
    'Making investing simple for everyone',
    ARRAY['Beginner','Basics','Education'],
    true, true, 'beginner_educator', 'free', true, NOW(), NOW()
  ),
  (
    'a0000001-0000-0000-0000-000000000008',
    'anna-martinez', 'annamartinez', 'Anna Martinez',
    'First-time investor guides and beginner-friendly explainers. No jargon, just clarity.',
    'Beginner Basics',
    'First-time investor guides',
    ARRAY['Beginner','Guides','Tips'],
    true, false, 'beginner_educator', 'free', true, NOW(), NOW()
  ),
  (
    'a0000001-0000-0000-0000-000000000009',
    'robert-kim', 'robertkim', 'Robert Kim',
    'Finance explained with simple real-world examples. Bridging the gap between textbook theory and everyday investing.',
    'Education',
    'Finance explained with simple examples',
    ARRAY['Beginner','Finance','Simple'],
    true, true, 'beginner_educator', 'free', true, NOW(), NOW()
  ),

  -- ── Quant Builders ───────────────────────────────────────────────
  (
    'a0000001-0000-0000-0000-000000000010',
    'sophie-turner', 'sophieturner', 'Sophie Turner',
    'Python quant models and systematic backtesting. Building reproducible, data-driven investment strategies.',
    'Quant Development',
    'Python quant models and backtesting',
    ARRAY['Python','Quant','Backtesting'],
    true, true, 'quant_builder', 'free', true, NOW(), NOW()
  ),
  (
    'a0000001-0000-0000-0000-000000000011',
    'marcus-johnson', 'marcusjohnson', 'Marcus Johnson',
    'Statistical arbitrage and market microstructure. Deep-dive research on how markets actually work.',
    'Advanced Quant',
    'Statistical arbitrage and market microstructure',
    ARRAY['Stats','Arbitrage','Advanced'],
    true, false, 'quant_builder', 'free', true, NOW(), NOW()
  ),

  -- ── Stock Pickers ────────────────────────────────────────────────
  (
    'a0000001-0000-0000-0000-000000000012',
    'rachel-green', 'rachelgreen', 'Rachel Green',
    'Deep value stock research and fundamental analysis. Finding mispriced companies the market has overlooked.',
    'Value Stocks',
    'Deep value stock research',
    ARRAY['Value','Research','Analysis'],
    true, true, 'stock_picker', 'free', true, NOW(), NOW()
  ),
  (
    'a0000001-0000-0000-0000-000000000013',
    'tom-anderson', 'tomanderson', 'Tom Anderson',
    'Growth stock opportunities and disruptive technology investing. Early-stage thesis building and portfolio management.',
    'Growth Stocks',
    'Growth stock opportunities',
    ARRAY['Growth','Stocks','Tech'],
    true, true, 'stock_picker', 'free', true, NOW(), NOW()
  ),

  -- ── Crypto Voices ────────────────────────────────────────────────
  (
    'a0000001-0000-0000-0000-000000000014',
    'crypto-katie', 'cryptokatie', 'Crypto Katie',
    'DeFi protocols and yield farming strategies. Breaking down complex on-chain mechanics into actionable insights.',
    'DeFi',
    'DeFi protocols and yield farming',
    ARRAY['DeFi','Crypto','Yield'],
    true, false, 'crypto_voice', 'free', true, NOW(), NOW()
  ),
  (
    'a0000001-0000-0000-0000-000000000015',
    'bitcoin-brian', 'bitcoinbrian', 'Bitcoin Brian',
    'Bitcoin fundamentals and macro investing. Understanding sound money, scarcity, and the role of BTC in a portfolio.',
    'Bitcoin',
    'Bitcoin fundamentals and macro',
    ARRAY['Bitcoin','Macro','Crypto'],
    true, true, 'crypto_voice', 'free', true, NOW(), NOW()
  ),

  -- ── Retirement Experts ───────────────────────────────────────────
  (
    'a0000001-0000-0000-0000-000000000016',
    'retirement-rachel', 'retirementrachel', 'Retirement Rachel',
    'IRA and 401k optimization strategies. Maximizing tax-advantaged accounts for a secure retirement.',
    'Retirement Planning',
    'IRA and 401k optimization',
    ARRAY['Retirement','IRA','401k'],
    true, true, 'retirement_expert', 'free', true, NOW(), NOW()
  ),
  (
    'a0000001-0000-0000-0000-000000000017',
    'dividend-dan', 'dividenddan', 'Dividend Dan',
    'Dividend growth investing for reliable passive income. Building a portfolio that pays you every month.',
    'Dividend Income',
    'Dividend growth investing for income',
    ARRAY['Dividends','Income','Retirement'],
    true, true, 'retirement_expert', 'free', true, NOW(), NOW()
  )

ON CONFLICT (id) DO UPDATE SET
  username          = EXCLUDED.username,
  handle            = EXCLUDED.handle,
  full_name         = EXCLUDED.full_name,
  bio               = EXCLUDED.bio,
  focus             = EXCLUDED.focus,
  tagline           = EXCLUDED.tagline,
  tags              = EXCLUDED.tags,
  is_creator        = EXCLUDED.is_creator,
  is_verified       = EXCLUDED.is_verified,
  featured_category = EXCLUDED.featured_category,
  updated_at        = NOW();

-- ── Step 3: restore FK enforcement ────────────────────────────────
SET session_replication_role = DEFAULT;

-- ── Step 4: ensure follows table has correct RLS policies ─────────
-- (safe to run even if policies already exist — DO $$ blocks catch duplicates)

DO $$ BEGIN
  CREATE POLICY "Follows are publicly readable"
    ON public.follows FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can follow"
    ON public.follows FOR INSERT TO authenticated
    WITH CHECK (follower_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can unfollow"
    ON public.follows FOR DELETE TO authenticated
    USING (follower_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
