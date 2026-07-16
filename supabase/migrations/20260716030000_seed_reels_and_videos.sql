-- ================================================================
-- Gazua — Seed Reels + Videos content
--
-- PURPOSE:
--   The /creators page's "Featured Content" and "Videos" rails read
--   live from the reels/videos tables. With those tables empty
--   (no creators have posted yet), both rails render as blank
--   "No content yet" states, which makes the live UI impossible to
--   evaluate. This seeds a handful of rows against the creator
--   profiles from 20260527000002_seed_creator_profiles.sql so the
--   live rails have real content to render, matching what the old
--   MOCK_REELS / CREATOR_VIDEOS fallback data used to show.
--
-- HOW TO APPLY:
--   Supabase Dashboard → SQL Editor → paste & run, OR
--   supabase db push (requires supabase CLI)
--
-- NOTES:
--   • thumbnail_url values are raw CSS gradient strings, not image
--     URLs — the frontend already treats any non-"http" thumbnail
--     value as a literal CSS `background` value (see
--     CreatorsPage.tsx's FEATURED_REEL_FALLBACK_GRADIENTS usage).
--   • storage_path is left NULL — no real uploaded video file is
--     seeded, so the reel/video renders its gradient poster without
--     a playable <video> source, same as the old mock fallback did.
--   • Fixed UUID prefixes (b0000001-… for reels, c0000001-… for
--     videos) make seeded rows easy to identify, and ON CONFLICT
--     makes the script idempotent.
-- ================================================================

INSERT INTO public.reels (
  id, creator_id, caption, thumbnail_url, tickers, share_count, created_at, updated_at
) VALUES
  (
    'b0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    E'Why I''m ALL IN on AI stocks right now \U0001F680 #NVDA #investing',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    ARRAY['NVDA'], 234, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  ),
  (
    'b0000001-0000-0000-0000-000000000002',
    'a0000001-0000-0000-0000-000000000002',
    E'Why I''m overweight $NVDA in my tech portfolio right now \U0001F914 #NVDA #growth',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    ARRAY['NVDA'], 198, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ),
  (
    'b0000001-0000-0000-0000-000000000003',
    'a0000001-0000-0000-0000-000000000003',
    'Built a backtested mean-reversion strategy in Python — here''s what works #SPY #quant',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    ARRAY['SPY'], 567, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
  ),
  (
    'b0000001-0000-0000-0000-000000000004',
    'a0000001-0000-0000-0000-000000000005',
    'The case for doing nothing with your $SPY position in a volatile market #SPY #passive',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    ARRAY['SPY'], 312, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
  ),
  (
    'b0000001-0000-0000-0000-000000000005',
    'a0000001-0000-0000-0000-000000000004',
    'Understanding Bitcoin''s correlation with traditional assets in 2026 #BTC #crypto',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    ARRAY['BTC'], 145, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
  )
ON CONFLICT (id) DO UPDATE SET
  caption       = EXCLUDED.caption,
  thumbnail_url = EXCLUDED.thumbnail_url,
  tickers       = EXCLUDED.tickers,
  share_count   = EXCLUDED.share_count,
  updated_at    = NOW();

INSERT INTO public.videos (
  id, creator_id, title, thumbnail_url, duration_seconds, view_count, created_at, updated_at
) VALUES
  (
    'c0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    E'5 Stocks I''m Buying in 2026',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    754, 234000, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ),
  (
    'c0000001-0000-0000-0000-000000000002',
    'a0000001-0000-0000-0000-000000000002',
    'Deep Dive: NVIDIA Growth Story',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    525, 189000, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
  ),
  (
    'c0000001-0000-0000-0000-000000000003',
    'a0000001-0000-0000-0000-000000000001',
    'Portfolio Update: March 2026',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    922, 421000, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
  ),
  (
    'c0000001-0000-0000-0000-000000000004',
    'a0000001-0000-0000-0000-000000000003',
    'Building a Quant Strategy in Python',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    618, 567000, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'
  ),
  (
    'c0000001-0000-0000-0000-000000000005',
    'a0000001-0000-0000-0000-000000000002',
    'Top 5 Tech Stocks for 2026',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    896, 312000, NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'
  ),
  (
    'c0000001-0000-0000-0000-000000000006',
    'a0000001-0000-0000-0000-000000000001',
    'ETFs vs Individual Stocks',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    663, 298000, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'
  ),
  (
    'c0000001-0000-0000-0000-000000000007',
    'a0000001-0000-0000-0000-000000000003',
    E'RSI & MACD: How I Use Them Together',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    567, 612000, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'
  ),
  (
    'c0000001-0000-0000-0000-000000000008',
    'a0000001-0000-0000-0000-000000000001',
    E'How I Built a $100K Portfolio',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    1005, 892000, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'
  ),
  (
    'c0000001-0000-0000-0000-000000000009',
    'a0000001-0000-0000-0000-000000000002',
    'Growth vs Value: Which Wins in 2026?',
    'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
    792, 445000, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'
  )
ON CONFLICT (id) DO UPDATE SET
  title             = EXCLUDED.title,
  thumbnail_url     = EXCLUDED.thumbnail_url,
  duration_seconds  = EXCLUDED.duration_seconds,
  view_count        = EXCLUDED.view_count,
  updated_at        = NOW();
