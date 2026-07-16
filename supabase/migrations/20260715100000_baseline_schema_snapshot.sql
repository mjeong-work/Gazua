-- ================================================================
-- Gazua Baseline Schema Snapshot
--
-- Captures the base tables that predate this repo's migration
-- history (created directly against the live project via the
-- Supabase Dashboard / an earlier tool, before `supabase/migrations`
-- existed): profiles, posts, reels, videos, post_likes, reel_likes,
-- follows, watchlist_items, notifications, models, subscriptions,
-- creator_memberships, creator_payouts, plus the handle_new_user()
-- signup trigger and the shared set_updated_at() trigger function.
--
-- Reconstructed by introspecting the live database's system
-- catalogs (pg_catalog / information_schema) on 2026-07-15, since
-- `supabase db pull`/`db dump` require Docker, which isn't available
-- in this environment. This file was recorded as already-applied
-- (`supabase migration repair --status applied`) rather than run
-- via `db push`, because every object it defines already exists in
-- the live project — its purpose is disaster recovery / environment
-- reprovisioning, not a live schema change.
--
-- NOTE: the live `follows` table currently also carries a second,
-- redundant set of RLS policies with malformed (CRLF-embedded) names
-- ("Authenticated users can ... follow", "Follows are publicly ...
-- readable", "Users can unfollow") duplicating the three policies
-- defined below. They were left out of this snapshot as unwanted
-- duplicates rather than reproduced — see the audit notes for
-- follow-up before they're dropped from the live project.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── shared trigger function ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $function$;

-- ── profiles ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id                     uuid NOT NULL,
  username               text NOT NULL,
  handle                 text,
  full_name              text NOT NULL DEFAULT '',
  avatar_url             text,
  bio                    text,
  focus                  text,
  tagline                text,
  tags                   text[] NOT NULL DEFAULT '{}',
  is_creator             boolean NOT NULL DEFAULT false,
  is_verified            boolean NOT NULL DEFAULT false,
  featured_category      text,
  portfolio_allocation   jsonb,
  subscription_tier      text NOT NULL DEFAULT 'free',
  stripe_customer_id     text,
  onboarding_level       text,
  onboarding_interests   text[] NOT NULL DEFAULT '{}',
  onboarding_risk_style  text,
  onboarding_completed   boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  terms_accepted_at      timestamptz,
  role                   text NOT NULL DEFAULT 'user',
  status                 text NOT NULL DEFAULT 'active',
  suspended_at           timestamptz,
  suspended_reason       text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT profiles_handle_key UNIQUE (handle),
  CONSTRAINT profiles_stripe_customer_id_key UNIQUE (stripe_customer_id),
  CONSTRAINT profiles_username_check CHECK (username ~ '^[a-z0-9_-]{3,30}$'),
  CONSTRAINT profiles_handle_check CHECK (handle ~ '^[a-zA-Z0-9_]{1,30}$'),
  CONSTRAINT profiles_subscription_tier_check CHECK (subscription_tier = ANY (ARRAY['free', 'analyst', 'educator'])),
  CONSTRAINT profiles_onboarding_level_check CHECK (onboarding_level = ANY (ARRAY['beginner', 'experienced', 'confident'])),
  CONSTRAINT profiles_onboarding_risk_style_check CHECK (onboarding_risk_style = ANY (ARRAY['conservative', 'balanced', 'aggressive', 'speculative'])),
  CONSTRAINT profiles_featured_category_check CHECK (featured_category = ANY (ARRAY['featured', 'trending', 'beginner_educator', 'quant_builder', 'stock_picker', 'crypto_voice', 'retirement_expert'])),
  CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['user', 'admin'])),
  CONSTRAINT profiles_status_check CHECK (status = ANY (ARRAY['active', 'warned', 'suspended']))
);

CREATE INDEX IF NOT EXISTS idx_profiles_is_creator ON public.profiles (is_creator) WHERE (is_creator = true);
CREATE INDEX IF NOT EXISTS idx_profiles_featured_category ON public.profiles (featured_category) WHERE (featured_category IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles (subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_tags_gin ON public.profiles USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON public.profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles (status);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "profiles: public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles: insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles: update own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (is_admin());

-- ── signup trigger: create a profiles row for every new auth user ─

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DECLARE
    base_username  text;
    uid_suffix     text;
    final_username text;
  BEGIN
    -- Strip non-alphanumeric characters from email local part
    base_username := lower(
      regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g')
    );

    -- Ensure minimum length
    IF length(base_username) < 3 THEN
      base_username := base_username || 'user';
    END IF;

    -- Cap so "{base}_{6 hex}" never exceeds the 30-char username limit
    base_username := left(base_username, 23);

    -- Append 6 hex chars from UUID — near-guaranteed uniqueness
    uid_suffix     := left(replace(NEW.id::text, '-', ''), 6);
    final_username := base_username || '_' || uid_suffix;

    INSERT INTO public.profiles (
      id,
      full_name,
      avatar_url,
      username
    )
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',   -- Google OAuth
        NEW.raw_user_meta_data->>'name',        -- some OAuth providers
        split_part(NEW.email, '@', 1)           -- email/password fallback
      ),
      NEW.raw_user_meta_data->>'avatar_url',    -- Google OAuth profile picture
      final_username
    );

    RETURN NEW;
  END;
  $function$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── posts ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.posts (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id         uuid NOT NULL,
  asset              text NOT NULL,
  category           text NOT NULL,
  content            text NOT NULL,
  tags               text[] NOT NULL DEFAULT '{}',
  sentiment          text,
  time_horizon       text,
  risk_level         text,
  confidence         text,
  share_count        integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  moderation_status  text NOT NULL DEFAULT 'visible',
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT posts_content_check CHECK (char_length(content) >= 1 AND char_length(content) <= 5000),
  CONSTRAINT posts_share_count_check CHECK (share_count >= 0),
  CONSTRAINT posts_sentiment_check CHECK (sentiment = ANY (ARRAY['Bullish', 'Neutral', 'Bearish'])),
  CONSTRAINT posts_time_horizon_check CHECK (time_horizon = ANY (ARRAY['Short-term', 'Medium-term', 'Long-term'])),
  CONSTRAINT posts_risk_level_check CHECK (risk_level = ANY (ARRAY['Low', 'Medium', 'High'])),
  CONSTRAINT posts_confidence_check CHECK (confidence = ANY (ARRAY['Low', 'Medium', 'High'])),
  CONSTRAINT posts_moderation_status_check CHECK (moderation_status = ANY (ARRAY['visible', 'removed']))
);

CREATE INDEX IF NOT EXISTS idx_posts_creator_id ON public.posts (creator_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_creator_time ON public.posts (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts (category);
CREATE INDEX IF NOT EXISTS idx_posts_asset ON public.posts (asset);
CREATE INDEX IF NOT EXISTS idx_posts_tags_gin ON public.posts USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_posts_content_fts ON public.posts USING gin (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS posts_moderation_status_idx ON public.posts (moderation_status);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "posts: public read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts: creator insert" ON public.posts FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "posts: creator update" ON public.posts FOR UPDATE USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "posts: creator delete" ON public.posts FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Admins read all posts" ON public.posts FOR SELECT TO authenticated USING (is_admin());

-- ── reels ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reels (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id         uuid NOT NULL,
  caption            text NOT NULL,
  thumbnail_url      text,
  storage_path       text,
  tickers            text[] NOT NULL DEFAULT '{}',
  share_count        integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  moderation_status  text NOT NULL DEFAULT 'visible',
  CONSTRAINT reels_pkey PRIMARY KEY (id),
  CONSTRAINT reels_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT reels_caption_check CHECK (char_length(caption) >= 1 AND char_length(caption) <= 2200),
  CONSTRAINT reels_share_count_check CHECK (share_count >= 0),
  CONSTRAINT reels_moderation_status_check CHECK (moderation_status = ANY (ARRAY['visible', 'removed']))
);

CREATE INDEX IF NOT EXISTS idx_reels_creator_id ON public.reels (creator_id);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON public.reels (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_creator_time ON public.reels (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_tickers_gin ON public.reels USING gin (tickers);
CREATE INDEX IF NOT EXISTS reels_moderation_status_idx ON public.reels (moderation_status);

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER reels_updated_at BEFORE UPDATE ON public.reels FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "reels: public read" ON public.reels FOR SELECT USING (true);
CREATE POLICY "reels: creator insert" ON public.reels FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "reels: creator update" ON public.reels FOR UPDATE USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "reels: creator delete" ON public.reels FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Admins read all reels" ON public.reels FOR SELECT TO authenticated USING (is_admin());

-- ── videos ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.videos (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id         uuid NOT NULL,
  title              text NOT NULL,
  thumbnail_url      text,
  storage_path       text,
  duration_seconds   integer,
  view_count         integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  moderation_status  text NOT NULL DEFAULT 'visible',
  CONSTRAINT videos_pkey PRIMARY KEY (id),
  CONSTRAINT videos_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT videos_title_check CHECK (char_length(title) >= 1 AND char_length(title) <= 300),
  CONSTRAINT videos_duration_seconds_check CHECK (duration_seconds > 0),
  CONSTRAINT videos_view_count_check CHECK (view_count >= 0),
  CONSTRAINT videos_moderation_status_check CHECK (moderation_status = ANY (ARRAY['visible', 'removed']))
);

CREATE INDEX IF NOT EXISTS idx_videos_creator_id ON public.videos (creator_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_creator_time ON public.videos (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS videos_moderation_status_idx ON public.videos (moderation_status);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "videos: public read" ON public.videos FOR SELECT USING (true);
CREATE POLICY "videos: creator insert" ON public.videos FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "videos: creator update" ON public.videos FOR UPDATE USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "videos: creator delete" ON public.videos FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Admins read all videos" ON public.videos FOR SELECT TO authenticated USING (is_admin());

-- ── models ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.models (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id       uuid NOT NULL,
  title            text NOT NULL,
  description      text,
  difficulty       text NOT NULL,
  file_type        text NOT NULL,
  category         text NOT NULL,
  access_level     text NOT NULL DEFAULT 'Free Preview',
  learnings        text[] NOT NULL DEFAULT '{}',
  storage_path     text,
  file_url         text,
  download_count   integer NOT NULL DEFAULT 0,
  remix_count      integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT models_pkey PRIMARY KEY (id),
  CONSTRAINT models_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT models_title_check CHECK (char_length(title) >= 1 AND char_length(title) <= 300),
  CONSTRAINT models_difficulty_check CHECK (difficulty = ANY (ARRAY['Beginner', 'Intermediate', 'Advanced', 'Expert'])),
  CONSTRAINT models_file_type_check CHECK (file_type = ANY (ARRAY['Excel', 'Google Sheet', 'Python', 'Notebook', 'PDF'])),
  CONSTRAINT models_category_check CHECK (category = ANY (ARRAY['Valuation', 'Portfolio', 'Quant Strategy', 'Market Dashboard', 'Beginner Template'])),
  CONSTRAINT models_access_level_check CHECK (access_level = ANY (ARRAY['Free Preview', 'Pro', 'Expert Only'])),
  CONSTRAINT models_download_count_check CHECK (download_count >= 0),
  CONSTRAINT models_remix_count_check CHECK (remix_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_models_creator_id ON public.models (creator_id);
CREATE INDEX IF NOT EXISTS idx_models_created_at ON public.models (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_models_category ON public.models (category);
CREATE INDEX IF NOT EXISTS idx_models_difficulty ON public.models (difficulty);
CREATE INDEX IF NOT EXISTS idx_models_access_level ON public.models (access_level);

ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER models_updated_at BEFORE UPDATE ON public.models FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "models: public read" ON public.models FOR SELECT USING (true);
CREATE POLICY "models: creator insert" ON public.models FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "models: creator update" ON public.models FOR UPDATE USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "models: creator delete" ON public.models FOR DELETE USING (auth.uid() = creator_id);

-- ── follows ──────────────────────────────────────────────────────
-- NOTE: only the three canonical policies are (re)created here.
-- The live table also has a second, redundant/malformed-name set —
-- see header comment. Not reproduced on purpose.

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id  uuid NOT NULL,
  creator_id   uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT follows_pkey PRIMARY KEY (follower_id, creator_id),
  CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT follows_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT follows_check CHECK (follower_id <> creator_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_creator_id ON public.follows (creator_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows: public read" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows: authenticated insert" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows: authenticated delete" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- ── watchlist_items ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL,
  ticker              text NOT NULL,
  name                text,
  asset_type          text NOT NULL DEFAULT 'Stock',
  interest_level      text NOT NULL DEFAULT 'Medium',
  status              text NOT NULL DEFAULT 'Watching',
  time_horizon        text NOT NULL DEFAULT 'Medium-term',
  source_type         text,
  source_content_id   uuid,
  source_label        text,
  thesis              text NOT NULL DEFAULT '',
  why_watching        text NOT NULL DEFAULT '',
  assumptions         text[] NOT NULL DEFAULT '{}',
  upside_drivers      text[] NOT NULL DEFAULT '{}',
  downside            text[] NOT NULL DEFAULT '{}',
  decision_notes      text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT watchlist_items_pkey PRIMARY KEY (id),
  CONSTRAINT watchlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT watchlist_items_ticker_check CHECK (char_length(ticker) >= 1 AND char_length(ticker) <= 20),
  CONSTRAINT watchlist_items_asset_type_check CHECK (asset_type = ANY (ARRAY['Stock', 'ETF', 'Crypto', 'Sector', 'Strategy'])),
  CONSTRAINT watchlist_items_interest_level_check CHECK (interest_level = ANY (ARRAY['Low', 'Medium', 'High'])),
  CONSTRAINT watchlist_items_status_check CHECK (status = ANY (ARRAY['Watching', 'Building Thesis', 'Ready to Act', 'Reviewing'])),
  CONSTRAINT watchlist_items_time_horizon_check CHECK (time_horizon = ANY (ARRAY['Short-term', 'Medium-term', 'Long-term'])),
  CONSTRAINT watchlist_items_source_type_check CHECK (source_type = ANY (ARRAY['post', 'reel', 'model', 'manual']))
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist_items (user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_created_at ON public.watchlist_items (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_ticker ON public.watchlist_items (user_id, ticker);
CREATE INDEX IF NOT EXISTS idx_watchlist_source ON public.watchlist_items (source_type, source_content_id) WHERE (source_content_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS watchlist_items_unique_source ON public.watchlist_items (user_id, source_type, source_content_id) WHERE (source_content_id IS NOT NULL);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER watchlist_items_updated_at BEFORE UPDATE ON public.watchlist_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "watchlist_items: owner read" ON public.watchlist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watchlist_items: owner insert" ON public.watchlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist_items: owner update" ON public.watchlist_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist_items: owner delete" ON public.watchlist_items FOR DELETE USING (auth.uid() = user_id);

-- ── notifications ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  type        text NOT NULL,
  title       text NOT NULL,
  message     text,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT notifications_title_check CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY['creator_post', 'price_alert', 'model_update', 'system']))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, created_at DESC) WHERE (read = false);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: owner read" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications: owner mark read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── subscriptions ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL,
  stripe_customer_id     text NOT NULL,
  stripe_subscription_id text NOT NULL,
  stripe_price_id        text NOT NULL,
  tier                   text NOT NULL,
  status                 text NOT NULL,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  canceled_at            timestamptz,
  trial_end              timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT subscriptions_user_id_key UNIQUE (user_id),
  CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id),
  CONSTRAINT subscriptions_tier_check CHECK (tier = ANY (ARRAY['free', 'analyst', 'educator'])),
  CONSTRAINT subscriptions_status_check CHECK (status = ANY (ARRAY['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'paused', 'unpaid']))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON public.subscriptions (stripe_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "subscriptions: owner read" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- ── creator_memberships (Stripe-backed creator subscriptions) ────

CREATE TABLE IF NOT EXISTS public.creator_memberships (
  id                       uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id               uuid NOT NULL,
  subscriber_id            uuid NOT NULL,
  stripe_subscription_id   text NOT NULL,
  stripe_price_id          text,
  status                   text NOT NULL,
  started_at               timestamptz NOT NULL DEFAULT now(),
  ended_at                 timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_memberships_pkey PRIMARY KEY (id),
  CONSTRAINT creator_memberships_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT creator_memberships_subscriber_id_fkey FOREIGN KEY (subscriber_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT creator_memberships_stripe_subscription_id_key UNIQUE (stripe_subscription_id),
  CONSTRAINT creator_memberships_check CHECK (creator_id <> subscriber_id),
  CONSTRAINT creator_memberships_status_check CHECK (status = ANY (ARRAY['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'paused', 'unpaid']))
);

CREATE INDEX IF NOT EXISTS idx_creator_memberships_creator_id ON public.creator_memberships (creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_memberships_subscriber_id ON public.creator_memberships (subscriber_id);
CREATE INDEX IF NOT EXISTS idx_creator_memberships_status ON public.creator_memberships (status);
CREATE INDEX IF NOT EXISTS idx_creator_memberships_stripe ON public.creator_memberships (stripe_subscription_id);

ALTER TABLE public.creator_memberships ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER creator_memberships_updated_at BEFORE UPDATE ON public.creator_memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "creator_memberships: participant read" ON public.creator_memberships FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = subscriber_id);

-- ── creator_payouts (Stripe Connect payout ledger) ────────────────

CREATE TABLE IF NOT EXISTS public.creator_payouts (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id            uuid NOT NULL,
  amount_cents          integer NOT NULL,
  platform_fee_cents    integer NOT NULL,
  stripe_transfer_id    text,
  stripe_payout_id      text,
  period_start          timestamptz NOT NULL,
  period_end            timestamptz NOT NULL,
  status                text NOT NULL DEFAULT 'pending',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_payouts_pkey PRIMARY KEY (id),
  CONSTRAINT creator_payouts_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT creator_payouts_stripe_transfer_id_key UNIQUE (stripe_transfer_id),
  CONSTRAINT creator_payouts_amount_cents_check CHECK (amount_cents > 0),
  CONSTRAINT creator_payouts_platform_fee_cents_check CHECK (platform_fee_cents >= 0),
  CONSTRAINT creator_payouts_check CHECK (period_end > period_start),
  CONSTRAINT creator_payouts_status_check CHECK (status = ANY (ARRAY['pending', 'paid', 'failed', 'canceled']))
);

CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator_id ON public.creator_payouts (creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator_period ON public.creator_payouts (creator_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_status ON public.creator_payouts (status);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_stripe_transfer ON public.creator_payouts (stripe_transfer_id) WHERE (stripe_transfer_id IS NOT NULL);

ALTER TABLE public.creator_payouts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER creator_payouts_updated_at BEFORE UPDATE ON public.creator_payouts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "creator_payouts: creator read" ON public.creator_payouts FOR SELECT USING (auth.uid() = creator_id);

-- ── post_likes ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id     uuid NOT NULL,
  user_id     uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_likes_pkey PRIMARY KEY (post_id, user_id),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
  CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes (user_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_likes: public read" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes: authenticated insert" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes: authenticated delete" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- ── reel_likes ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reel_likes (
  reel_id     uuid NOT NULL,
  user_id     uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reel_likes_pkey PRIMARY KEY (reel_id, user_id),
  CONSTRAINT reel_likes_reel_id_fkey FOREIGN KEY (reel_id) REFERENCES public.reels(id) ON DELETE CASCADE,
  CONSTRAINT reel_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON public.reel_likes (reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_likes_user_id ON public.reel_likes (user_id);

ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reel_likes: public read" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "reel_likes: authenticated insert" ON public.reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reel_likes: authenticated delete" ON public.reel_likes FOR DELETE USING (auth.uid() = user_id);
