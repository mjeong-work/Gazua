// ================================================================
// GAZUA — Supabase Database Types
// Mirrors the production schema exactly.
// Run `supabase gen types typescript` to regenerate after schema changes.
// ================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enum helpers ─────────────────────────────────────────────────
export type SubscriptionTier = 'free' | 'analyst' | 'educator'
export type SubscriptionStatus =
  | 'active' | 'trialing' | 'past_due' | 'canceled'
  | 'incomplete' | 'incomplete_expired' | 'paused' | 'unpaid'
export type OnboardingLevel = 'beginner' | 'experienced' | 'confident'
export type RiskStyle = 'conservative' | 'balanced' | 'aggressive' | 'speculative'
export type FeaturedCategory =
  | 'featured' | 'trending' | 'beginner_educator'
  | 'quant_builder' | 'stock_picker' | 'crypto_voice' | 'retirement_expert'
export type AssetType = 'Stock' | 'ETF' | 'Crypto' | 'Sector' | 'Strategy'
export type WatchlistStatus = 'Watching' | 'Building Thesis' | 'Ready to Act' | 'Reviewing'
export type InterestLevel = 'Low' | 'Medium' | 'High'
export type TimeHorizon = 'Short-term' | 'Medium-term' | 'Long-term'
export type WatchlistSourceType = 'post' | 'reel' | 'model' | 'manual'
export type NotificationType = 'creator_post' | 'price_alert' | 'model_update' | 'system'
export type ModelDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
export type ModelFileType = 'Excel' | 'Google Sheet' | 'Python' | 'Notebook' | 'PDF'
export type ModelCategory =
  | 'Valuation' | 'Portfolio' | 'Quant Strategy'
  | 'Market Dashboard' | 'Beginner Template'
export type ModelAccessLevel = 'Free Preview' | 'Pro' | 'Expert Only'
export type PostSentiment = 'Bullish' | 'Neutral' | 'Bearish'
export type ContentSentiment = 'Bullish' | 'Neutral' | 'Bearish'
export type RiskLevel = 'Low' | 'Medium' | 'High'
export type Confidence = 'Low' | 'Medium' | 'High'
export type PayoutStatus = 'pending' | 'paid' | 'failed' | 'canceled'

// ── Portfolio allocation JSON shape ──────────────────────────────
// Stored in profiles.portfolio_allocation
// Colors are intentionally excluded — applied by the frontend.
export interface AllocationSlice {
  name: string   // "Stocks", "ETFs", "Crypto", "Cash"
  value: number  // integer percentage, all slices must sum to 100
}

// ================================================================
// DATABASE SCHEMA
// ================================================================

export interface Database {
  public: {
    Tables: {

      // ── profiles ───────────────────────────────────────────────
      profiles: {
        Row: {
          id: string
          username: string
          handle: string | null
          full_name: string
          avatar_url: string | null
          bio: string | null
          focus: string | null
          tagline: string | null
          tags: string[]
          is_creator: boolean
          is_verified: boolean
          featured_category: FeaturedCategory | null
          portfolio_allocation: Json | null
          subscription_tier: SubscriptionTier
          stripe_customer_id: string | null
          onboarding_level: OnboardingLevel | null
          onboarding_interests: string[]
          onboarding_risk_style: RiskStyle | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          handle?: string | null
          full_name?: string
          avatar_url?: string | null
          bio?: string | null
          focus?: string | null
          tagline?: string | null
          tags?: string[]
          is_creator?: boolean
          is_verified?: boolean
          featured_category?: FeaturedCategory | null
          portfolio_allocation?: Json | null
          subscription_tier?: SubscriptionTier
          stripe_customer_id?: string | null
          onboarding_level?: OnboardingLevel | null
          onboarding_interests?: string[]
          onboarding_risk_style?: RiskStyle | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          handle?: string | null
          full_name?: string
          avatar_url?: string | null
          bio?: string | null
          focus?: string | null
          tagline?: string | null
          tags?: string[]
          is_creator?: boolean
          is_verified?: boolean
          featured_category?: FeaturedCategory | null
          portfolio_allocation?: Json | null
          subscription_tier?: SubscriptionTier
          stripe_customer_id?: string | null
          onboarding_level?: OnboardingLevel | null
          onboarding_interests?: string[]
          onboarding_risk_style?: RiskStyle | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // ── posts ──────────────────────────────────────────────────
      posts: {
        Row: {
          id: string
          creator_id: string
          asset: string
          category: string
          content: string
          tags: string[]
          sentiment: PostSentiment | null
          time_horizon: TimeHorizon | null
          risk_level: RiskLevel | null
          confidence: Confidence | null
          share_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          asset: string
          category: string
          content: string
          tags?: string[]
          sentiment?: PostSentiment | null
          time_horizon?: TimeHorizon | null
          risk_level?: RiskLevel | null
          confidence?: Confidence | null
          share_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          asset?: string
          category?: string
          content?: string
          tags?: string[]
          sentiment?: PostSentiment | null
          time_horizon?: TimeHorizon | null
          risk_level?: RiskLevel | null
          confidence?: Confidence | null
          share_count?: number
          created_at?: string
          updated_at?: string
        }
      }

      // ── post_likes ─────────────────────────────────────────────
      post_likes: {
        Row: {
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }

      // ── post_comments ─────────────────────────────────────────
      post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }

      // ── reels ──────────────────────────────────────────────────
      reels: {
        Row: {
          id: string
          creator_id: string
          caption: string
          thumbnail_url: string | null
          storage_path: string | null
          tickers: string[]
          share_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          caption: string
          thumbnail_url?: string | null
          storage_path?: string | null
          tickers?: string[]
          share_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          caption?: string
          thumbnail_url?: string | null
          storage_path?: string | null
          tickers?: string[]
          share_count?: number
          created_at?: string
          updated_at?: string
        }
      }

      // ── reel_likes ─────────────────────────────────────────────
      reel_likes: {
        Row: {
          reel_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          reel_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          reel_id?: string
          user_id?: string
          created_at?: string
        }
      }

      // ── videos ─────────────────────────────────────────────────
      videos: {
        Row: {
          id: string
          creator_id: string
          title: string
          thumbnail_url: string | null
          storage_path: string | null
          duration_seconds: number | null
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          thumbnail_url?: string | null
          storage_path?: string | null
          duration_seconds?: number | null
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          thumbnail_url?: string | null
          storage_path?: string | null
          duration_seconds?: number | null
          view_count?: number
          created_at?: string
          updated_at?: string
        }
      }

      // ── models ─────────────────────────────────────────────────
      models: {
        Row: {
          id: string
          creator_id: string
          title: string
          description: string | null
          difficulty: ModelDifficulty
          file_type: ModelFileType
          category: ModelCategory
          access_level: ModelAccessLevel
          learnings: string[]
          storage_path: string | null
          file_url: string | null
          download_count: number
          remix_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          title: string
          description?: string | null
          difficulty: ModelDifficulty
          file_type: ModelFileType
          category: ModelCategory
          access_level?: ModelAccessLevel
          learnings?: string[]
          storage_path?: string | null
          file_url?: string | null
          download_count?: number
          remix_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          title?: string
          description?: string | null
          difficulty?: ModelDifficulty
          file_type?: ModelFileType
          category?: ModelCategory
          access_level?: ModelAccessLevel
          learnings?: string[]
          storage_path?: string | null
          file_url?: string | null
          download_count?: number
          remix_count?: number
          created_at?: string
          updated_at?: string
        }
      }

      // ── watchlist_items ────────────────────────────────────────
      watchlist_items: {
        Row: {
          id: string
          user_id: string
          ticker: string
          name: string | null
          asset_type: AssetType
          interest_level: InterestLevel
          status: WatchlistStatus
          time_horizon: TimeHorizon
          source_type: WatchlistSourceType | null
          source_content_id: string | null
          source_label: string | null
          thesis: string
          why_watching: string
          assumptions: string[]
          upside_drivers: string[]
          downside: string[]
          decision_notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          name?: string | null
          asset_type?: AssetType
          interest_level?: InterestLevel
          status?: WatchlistStatus
          time_horizon?: TimeHorizon
          source_type?: WatchlistSourceType | null
          source_content_id?: string | null
          source_label?: string | null
          thesis?: string
          why_watching?: string
          assumptions?: string[]
          upside_drivers?: string[]
          downside?: string[]
          decision_notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          name?: string | null
          asset_type?: AssetType
          interest_level?: InterestLevel
          status?: WatchlistStatus
          time_horizon?: TimeHorizon
          source_type?: WatchlistSourceType | null
          source_content_id?: string | null
          source_label?: string | null
          thesis?: string
          why_watching?: string
          assumptions?: string[]
          upside_drivers?: string[]
          downside?: string[]
          decision_notes?: string
          created_at?: string
          updated_at?: string
        }
      }

      // ── follows ────────────────────────────────────────────────
      follows: {
        Row: {
          follower_id: string
          creator_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          creator_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          creator_id?: string
          created_at?: string
        }
      }

      // ── notifications ──────────────────────────────────────────
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          message?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          title?: string
          message?: string | null
          read?: boolean
          created_at?: string
        }
      }

      // ── subscriptions (Stripe platform) ───────────────────────
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          tier: SubscriptionTier
          status: SubscriptionStatus
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          tier: SubscriptionTier
          status: SubscriptionStatus
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          stripe_price_id?: string
          tier?: SubscriptionTier
          status?: SubscriptionStatus
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ── creator_memberships (Stripe per-creator) ───────────────
      creator_memberships: {
        Row: {
          id: string
          creator_id: string
          subscriber_id: string
          stripe_subscription_id: string
          stripe_price_id: string | null
          status: SubscriptionStatus
          started_at: string
          ended_at: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          subscriber_id: string
          stripe_subscription_id: string
          stripe_price_id?: string | null
          status: SubscriptionStatus
          started_at?: string
          ended_at?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          subscriber_id?: string
          stripe_subscription_id?: string
          stripe_price_id?: string | null
          status?: SubscriptionStatus
          started_at?: string
          ended_at?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // ── creator_payouts (Stripe Connect) ───────────────────────
      creator_payouts: {
        Row: {
          id: string
          creator_id: string
          amount_cents: number
          platform_fee_cents: number
          stripe_transfer_id: string | null
          stripe_payout_id: string | null
          period_start: string
          period_end: string
          status: PayoutStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          amount_cents: number
          platform_fee_cents: number
          stripe_transfer_id?: string | null
          stripe_payout_id?: string | null
          period_start: string
          period_end: string
          status?: PayoutStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          amount_cents?: number
          platform_fee_cents?: number
          stripe_transfer_id?: string | null
          stripe_payout_id?: string | null
          period_start?: string
          period_end?: string
          status?: PayoutStatus
          created_at?: string
          updated_at?: string
        }
      }

    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ================================================================
// CONVENIENCE TYPES
// Shorthand aliases used throughout the codebase.
// ================================================================

type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]

export type Profile             = Tables<'profiles'>['Row']
export type ProfileInsert       = Tables<'profiles'>['Insert']
export type ProfileUpdate       = Tables<'profiles'>['Update']

export type Post                = Tables<'posts'>['Row']
export type PostInsert          = Tables<'posts'>['Insert']
export type PostUpdate          = Tables<'posts'>['Update']

export type PostLike            = Tables<'post_likes'>['Row']

export type Reel                = Tables<'reels'>['Row']
export type ReelInsert          = Tables<'reels'>['Insert']
export type ReelUpdate          = Tables<'reels'>['Update']

export type ReelLike            = Tables<'reel_likes'>['Row']

export type Video               = Tables<'videos'>['Row']
export type VideoInsert         = Tables<'videos'>['Insert']
export type VideoUpdate         = Tables<'videos'>['Update']

export type Model               = Tables<'models'>['Row']
export type ModelInsert         = Tables<'models'>['Insert']
export type ModelUpdate         = Tables<'models'>['Update']

export type WatchlistItem       = Tables<'watchlist_items'>['Row']
export type WatchlistItemInsert = Tables<'watchlist_items'>['Insert']
export type WatchlistItemUpdate = Tables<'watchlist_items'>['Update']

export type Follow              = Tables<'follows'>['Row']

export type Notification        = Tables<'notifications'>['Row']
export type NotificationInsert  = Tables<'notifications'>['Insert']

export type Subscription        = Tables<'subscriptions'>['Row']
export type CreatorMembership   = Tables<'creator_memberships'>['Row']
export type CreatorPayout       = Tables<'creator_payouts'>['Row']

// ── Joined / enriched types returned by service functions ────────

/** Creator info embedded via JOIN on creator_id → profiles */
export type CreatorSnippet = Pick<
  Profile,
  'id' | 'username' | 'handle' | 'full_name' | 'avatar_url' | 'is_verified'
>

export type PostWithCreator = Post & {
  creator: CreatorSnippet
  like_count: number
}

export type ReelWithCreator = Reel & {
  creator: CreatorSnippet
  like_count: number
}

export type VideoWithCreator = Video & {
  creator: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>
}

export type ModelWithCreator = Model & {
  creator: Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>
}
