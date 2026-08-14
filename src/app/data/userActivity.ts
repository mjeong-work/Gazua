import { supabase } from '../../lib/supabase';
import { MOCK_WATCHLIST_ITEMS, type WatchlistItem } from './watchlist';
import { MOCK_POSTS } from './posts';
import { MOCK_CREATORS } from './creators';

export interface UserActivity {
  watchlistTickers: string[];
  watchlistAssetTypes: string[];
  followedCreatorFoci: string[];
  categoryEngagement: { category: string; count: number }[];
  savedCounts: { posts: number; reels: number; models: number };
  onboarding: {
    level: string | null;
    interests: string[];
    riskStyle: string | null;
  };
}

// ── Swap this function body for a Supabase query when the backend is connected.
// The signature stays identical — only the body changes.
export async function getUserActivity(
  _userId?: string,
  opts?: {
    liveWatchlist?: WatchlistItem[];
    level?: string | null;
    interests?: string[];
    riskStyle?: string | null;
  }
): Promise<UserActivity> {
  // Resolve the authenticated user (or use the passed userId override)
  const resolvedUserId = _userId ?? (await supabase.auth.getUser()).data.user?.id ?? null;

  // ── Onboarding data ─────────────────────────────────────────────
  // Prefer the live context values passed via opts (fastest path).
  let level     = opts?.level     ?? null;
  let interests = opts?.interests ?? [];
  let riskStyle = opts?.riskStyle ?? null;

  if (resolvedUserId && (!level || interests.length === 0)) {
    // Fetch from DB when the context didn't pass values (e.g. direct API call)
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_level, onboarding_interests, onboarding_risk_style')
      .eq('id', resolvedUserId)
      .single();

    if (profile) {
      level     = level     ?? profile.onboarding_level;
      interests = interests.length === 0 ? (profile.onboarding_interests ?? []) : interests;
      riskStyle = riskStyle ?? profile.onboarding_risk_style;
    }
  }

  // ── Watchlist data ──────────────────────────────────────────────
  let watchlistItems: { ticker: string; asset_type: string; source_type: string | null }[];

  if (resolvedUserId && !opts?.liveWatchlist) {
    const { data } = await supabase
      .from('watchlist_items')
      .select('ticker, asset_type, source_type')
      .eq('user_id', resolvedUserId);
    watchlistItems = data ?? [];
  } else if (opts?.liveWatchlist) {
    // Use the in-memory context watchlist directly (avoids extra round-trip)
    watchlistItems = opts.liveWatchlist.map(i => ({
      ticker: i.ticker,
      asset_type: i.asset_type,
      source_type: i.source_type ?? null,
    }));
  } else {
    // Guest / unauthenticated — fall back to mock seed data
    watchlistItems = (MOCK_WATCHLIST_ITEMS as unknown as typeof watchlistItems);
  }

  const watchlistTickers   = watchlistItems.map(i => i.ticker);
  const watchlistAssetTypes = [...new Set(watchlistItems.map(i => i.asset_type))];
  const savedCounts = {
    posts:  watchlistItems.filter(i => i.source_type === 'post').length,
    reels:  watchlistItems.filter(i => i.source_type === 'reel').length,
    models: watchlistItems.filter(i => i.source_type === 'model').length,
  };

  // ── Followed creator foci ───────────────────────────────────────
  let followedCreatorFoci: string[];

  if (resolvedUserId) {
    // Get UUIDs of followed creators, then join to profiles for focus
    const { data: follows } = await supabase
      .from('follows')
      .select('creator_id')
      .eq('follower_id', resolvedUserId)
      .limit(10);

    if (follows && follows.length > 0) {
      const creatorIds = follows.map(f => f.creator_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('focus')
        .in('id', creatorIds)
        .not('focus', 'is', null);

      followedCreatorFoci = (profiles ?? []).map(p => p.focus).filter(Boolean) as string[];
    } else {
      // A real, authenticated user who genuinely doesn't follow anyone yet — [], not mock
      // creator foci standing in for their (nonexistent) activity. Claude gets an honestly
      // empty signal here, same as any other real-but-sparse account, rather than analyzing
      // data that isn't theirs (audit finding — this is what "AI insights are fed by
      // fabricated activity" meant).
      followedCreatorFoci = [];
    }
  } else {
    // Genuinely logged-out preview — mock is a reasonable stand-in here, since there's no
    // "your real data" claim being made to a guest.
    followedCreatorFoci = Object.values(MOCK_CREATORS).slice(0, 5).map(c => c.focus);
  }

  // ── Category engagement ─────────────────────────────────────────
  // Derived from post_likes for authenticated users; from mock posts for guests.
  let categoryEngagement: { category: string; count: number }[];

  if (resolvedUserId) {
    const { data: likedPosts } = await supabase
      .from('post_likes')
      .select('posts(category)')
      .eq('user_id', resolvedUserId)
      .limit(100);

    if (likedPosts && likedPosts.length > 0) {
      const categoryMap: Record<string, number> = {};
      for (const row of likedPosts) {
        const cat = (row.posts as unknown as { category: string } | null)?.category;
        if (cat) categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
      }
      categoryEngagement = Object.entries(categoryMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
    } else {
      // A real user who hasn't liked anything yet — [], not global mock-post category counts
      // presented as if they reflected this person's engagement.
      categoryEngagement = [];
    }
  } else {
    // Genuinely logged-out preview — same reasoning as followedCreatorFoci above.
    categoryEngagement = buildMockCategoryEngagement();
  }

  return {
    watchlistTickers,
    watchlistAssetTypes,
    followedCreatorFoci,
    categoryEngagement,
    savedCounts,
    onboarding: { level, interests, riskStyle },
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function buildMockCategoryEngagement(): { category: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const post of MOCK_POSTS) {
    map[post.category] = (map[post.category] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}
