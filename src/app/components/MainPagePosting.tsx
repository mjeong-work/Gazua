import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useOnboarding } from '../contexts/OnboardingContext';
import { CHART_TOOLTIP_STYLE, chartCurrencyFormatter, showChartLabel } from '../utils/chartTooltip';
import AppHeader from './AppHeader';
import { MOCK_POSTS, type Post } from '../data/posts';
import { getPosts, getPostsByCreatorIds, likePost, unlikePost, getUserLikedPostIds, incrementShareCount } from '../../lib/services/posts.service';
import type { PostWithCreator as DbPost } from '../../types/database';
import { useFollow, isUUID } from '../contexts/FollowContext';
import { useAuth } from '../contexts/AuthContext';
import { MARKET_INDICES } from '../data/marketData';
import { getMarketIndices, getTickerInfo, getLiveTickerChart, type LiveTickerInfo } from '../../lib/market.service';
import type { MarketIndex } from '../data/marketData';
import { useWatchlist, categoryToAssetType } from '../contexts/WatchlistContext';
import { getCreator } from '../data/creators';
import { isCreatorVerified } from '../utils/creator';
import VerifiedBadge from './VerifiedBadge';
import { useSwipePanel } from '../hooks/useSwipePanel';
import ReportButton from './compliance/ReportButton';
import { AlgorithmicLabel, derivePostLabel } from './compliance/AlgorithmicLabel';
import SendIcon from '@mui/icons-material/Send';
import { getComments, addComment, type CommentWithAuthor } from '../../lib/services/comments.service';
import { useServiceQuery, reportServiceError } from '../hooks/useServiceQuery';
import CommentPanel from './CommentPanel';
import Footer from './Footer';

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Shape DB PostWithCreator into the flat Post shape the JSX already consumes.
// avatar_url from the DB will eventually render as an <img> — until JSX is
// updated for that, a single-letter initial falls back gracefully as emoji text.
function normalizeDbPost(p: DbPost, index: number): Post {
  const initial = (p.creator.full_name?.[0] ?? '?').toUpperCase();
  return {
    id: index,
    db_id: p.id,   // preserve Supabase UUID for like persistence
    creator: p.creator.full_name,
    creator_id: p.creator.username,
    avatar: initial,
    verified: isCreatorVerified(p.creator),
    asset: p.asset,
    category: p.category,
    created_at: formatRelativeTime(p.created_at),
    content: p.content,
    likes: p.like_count,
    comments: 0,
    shares: p.share_count,
    sentiment: (p.sentiment as Post['sentiment']) ?? 'Neutral',
    time_horizon: (p.time_horizon as Post['time_horizon']) ?? 'Medium-term',
    risk_level: (p.risk_level as Post['risk_level']) ?? 'Medium',
    confidence: (p.confidence as Post['confidence']) ?? 'Medium',
    tags: p.tags,
  };
}

// ── Inline comment helpers ────────────────────────────────────────
function formatCommentTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const COMMENT_AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];

function InlineComments({
  postId,
  initialCount,
  onCountChange,
}: {
  postId: string;
  initialCount: number;
  onCountChange: (n: number) => void;
}) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: commentsData, loading } = useServiceQuery(
    () => getComments(postId),
    [postId],
    { enabled: !!postId, label: 'comments' },
  );
  useEffect(() => { if (commentsData) setComments(commentsData); }, [commentsData]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || !profile || submitting) return;

    if (!postId) {
      setError('Comments are only available on published posts.');
      return;
    }

    const optimistic: CommentWithAuthor = {
      id: `optimistic-${Date.now()}`,
      post_id: postId,
      user_id: user.id,
      content: trimmed,
      created_at: new Date().toISOString(),
      author: { full_name: profile.full_name, username: profile.username },
    };

    setComments(prev => [...prev, optimistic]);
    onCountChange(comments.length + 1);
    setText('');
    setSubmitting(true);
    setError(null);

    const { data, error: err } = await addComment(postId, user.id, trimmed);
    setSubmitting(false);

    if (err || !data) {
      console.error('[addComment]', err);
      setComments(prev => prev.filter(c => c.id !== optimistic.id));
      onCountChange(comments.length);
      setError(err ?? 'Failed to post. Try again.');
      setText(trimmed);
      return;
    }
    setComments(prev => prev.map(c => c.id === optimistic.id ? data : c));
  };

  return (
    <div className="border-t border-neutral-100 mt-3 pt-3 pb-1">
      {loading && (
        <div className="space-y-3 mb-3">
          {[1, 2].map(n => (
            <div key={n} className="flex gap-2 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-neutral-200 flex-shrink-0" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="h-2.5 bg-neutral-200 rounded w-1/4" />
                <div className="h-2.5 bg-neutral-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && comments.length === 0 && (
        <p className="text-xs text-neutral-400 text-center py-2 mb-2">No comments yet. Be the first!</p>
      )}

      {!loading && comments.length > 0 && (
        <div className="space-y-3 mb-3 max-h-52 overflow-y-auto">
          {comments.map(c => {
            const initial = (c.author.full_name?.[0] ?? '?').toUpperCase();
            const color = COMMENT_AVATAR_COLORS[initial.charCodeAt(0) % COMMENT_AVATAR_COLORS.length];
            return (
              <div key={c.id} className="flex gap-2">
                <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xs font-bold leading-tight">{c.author.full_name}</span>
                    <span className="text-[10px] text-neutral-400">{formatCommentTime(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed break-words mt-0.5">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!postId ? (
        <p className="text-xs text-neutral-400 text-center py-2">Comments available on published posts</p>
      ) : !user ? (
        <p className="text-xs text-neutral-400 text-center py-1">Sign in to leave a comment</p>
      ) : (
        <>
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <div className="flex gap-2 items-center mt-1">
            <input
              type="text"
              placeholder="Add a comment…"
              value={text}
              onChange={e => setText(e.target.value.slice(0, 500))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              disabled={submitting}
              className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-sm text-xs focus:outline-none focus:border-brand transition-colors disabled:opacity-50 bg-neutral-50"
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-brand text-white hover:bg-brand-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Post comment"
            >
              <SendIcon sx={{ fontSize: 14 }} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MainPagePosting() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const ticker = searchParams.get('ticker')?.toUpperCase() ?? null;

  const { user } = useAuth();
  const { data: onboardingData, isOnboarded } = useOnboarding();
  const [activeTab, setActiveTab] = useState<'posting' | 'reels' | 'following'>('posting');
  const [contentFilter, setContentFilter] = useState<'All' | 'Stocks' | 'ETFs' | 'Crypto' | 'Retirement' | 'Options' | 'News' | 'Beginner'>('All');
  const { addToWatchlist, removeBySource, isSaved } = useWatchlist();

  // Onboarding welcome banner — dismissible, persisted so it stays hidden after reload.
  const [welcomeBannerDismissed, setWelcomeBannerDismissed] = useState(() => {
    try { return localStorage.getItem('gazua:welcome_banner_dismissed') === '1'; } catch { return false; }
  });
  const dismissWelcomeBanner = () => {
    setWelcomeBannerDismissed(true);
    try { localStorage.setItem('gazua:welcome_banner_dismissed', '1'); } catch { /* ignore */ }
  };

  // Like state — keyed by db_id (UUID) for DB posts, or 'local-{id}' for mock posts.
  const [likedPosts, setLikedPosts] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('gazua:local_post_likes');
      return new Set(saved ? (JSON.parse(saved) as string[]) : []);
    } catch { return new Set(); }
  });
  // Tracks which posts were already liked when the page loaded (hydrated from Supabase).
  // Used to avoid double-counting: post.likes from DB already includes the user's own like.
  const [hydratedLikedIds, setHydratedLikedIds] = useState<Set<string>>(new Set());
  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('1M');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSubtitle, setToastSubtitle] = useState('');
  const { isPanelOpen, openPanel, closePanel, swipeHandlers } = useSwipePanel();

  // Inline comment expansion — key matches getLikeKey(post)
  const [expandedCommentPostId, setExpandedCommentPostId] = useState<string | null>(null);
  // Mobile bottom-sheet comment state
  const [mobileCommentPost, setMobileCommentPost] = useState<{
    key: string; dbId: string; title: string; initialCount: number;
  } | null>(null);
  // Per-post comment count overrides (updated after user comments)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  // Per-post share count overrides (optimistic after user taps share)
  const [shareCounts, setShareCounts] = useState<Record<string, number>>({});
  // Key incremented to force a feed re-fetch after post creation
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);

  // ── Follow state ───────────────────────────────────────────────────
  const { followedIds, isLoading: followLoading } = useFollow();
  const [followingPosts, setFollowingPosts] = useState<Post[] | null>(null);
  const [followingPostsLoading, setFollowingPostsLoading] = useState(false);
  const [followingPostsRefreshKey, setFollowingPostsRefreshKey] = useState(0);

  // Supabase-backed post data. null = not yet resolved (use mock fallback).
  const [dbPosts, setDbPosts] = useState<Post[] | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setPostsLoading(true);

    const category =
      contentFilter === 'All' ? undefined :
      contentFilter === 'Beginner' ? 'Beginner Basics' : contentFilter;

    getPosts({ ticker: ticker ?? undefined, category, limit: 20 }).then(({ data, error }) => {
      if (cancelled) return;
      setPostsLoading(false);
      if (error || !data) {
        setDbPosts(null); // signal: use mock fallback (error / no Supabase config)
        return;
      }
      setDbPosts(data.map(normalizeDbPost)); // real result, possibly a real empty array
    });

    return () => { cancelled = true; };
  }, [ticker, contentFilter, postsRefreshKey]);

  // ── Load posts for the Following tab ──────────────────────────────
  // Re-runs when the user switches to the following tab or changes their follow list.
  const followedIdsKey = Array.from(followedIds).sort().join(',');
  useEffect(() => {
    if (activeTab !== 'following') return;
    if (followLoading) return;

    // Only pass valid Supabase UUIDs — local mock-creator slugs/IDs are not
    // stored in the posts table and would cause a Supabase type error.
    const dbCreatorIds = Array.from(followedIds).filter(isUUID);
    if (!dbCreatorIds.length) {
      setFollowingPosts([]);
      return;
    }

    let cancelled = false;
    setFollowingPostsLoading(true);

    getPostsByCreatorIds(dbCreatorIds).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        reportServiceError(error, {
          label: 'posts from creators you follow',
          retry: () => setFollowingPostsRefreshKey(k => k + 1),
        });
      }
      setFollowingPosts(data ? data.map(normalizeDbPost) : []);
      setFollowingPostsLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeTab, followedIdsKey, followLoading, followingPostsRefreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [liveIndices, setLiveIndices] = useState<MarketIndex[]>(MARKET_INDICES);
  const [indicesLoading, setIndicesLoading] = useState(true);
  const [defaultInfo, setDefaultInfo] = useState<LiveTickerInfo | null>(null);
  const [defaultChartData, setDefaultChartData] = useState<{ time: string; value: number }[] | null>(null);
  const [liveTickerInfo, setLiveTickerInfo] = useState<LiveTickerInfo | null>(null);
  const [liveChartData, setLiveChartData] = useState<{ time: string; value: number }[] | null>(null);

  useEffect(() => {
    setIndicesLoading(true);
    getMarketIndices().then(d => { setLiveIndices(d); setIndicesLoading(false); });
    getTickerInfo('SPY').then(setDefaultInfo);
  }, []);

  useEffect(() => {
    if (!ticker) { setLiveTickerInfo(null); return; }
    getTickerInfo(ticker).then(setLiveTickerInfo);
  }, [ticker]);

  useEffect(() => {
    const target = ticker ?? 'SPY';
    getLiveTickerChart(target, activeTimeRange).then(data => {
      if (ticker) setLiveChartData(data);
      else setDefaultChartData(data);
    });
  }, [ticker, activeTimeRange]);

  const tickerInfo = liveTickerInfo ?? defaultInfo;

  const triggerToast = (message: string, subtitle = '') => {
    setToastMessage(message);
    setToastSubtitle(subtitle);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Same real share pattern already used by reels (ReelMoreMenu): native share sheet when
  // available, clipboard-copy fallback otherwise. No dedicated post-permalink page exists yet,
  // so this shares the current feed URL — same convention reels already use.
  const handleShare = async (post: Post) => {
    const shareUrl = window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: post.asset, text: post.content.slice(0, 100), url: shareUrl });
      } catch {
        return; // user cancelled the native share sheet — not an error
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        triggerToast('Link copied');
      } catch {
        triggerToast('Could not copy link');
        return;
      }
    }

    if (post.db_id) {
      const key = getLikeKey(post);
      setShareCounts(prev => ({ ...prev, [key]: (prev[key] ?? post.shares) + 1 }));
      incrementShareCount(post.db_id).catch(() => {});
    }
  };

  const handleSaveToWatchlist = async (post: Post) => {
    if (!isSaved('post', post.db_id)) {
      const saved = await addToWatchlist({
        ticker: post.asset,
        name: post.asset,
        assetType: categoryToAssetType(post.category),
        source_type: 'post',
        source_content_id: post.db_id,
        source: `Saved from post by ${post.creator}`,
      });
      if (saved) {
        triggerToast('Saved to Watchlist', 'Build your thesis in the Watchlist tab');
      }
    } else {
      removeBySource('post', post.db_id);
      triggerToast('Removed from Watchlist');
    }
  };

  // Helper: stable key per post regardless of mock vs DB
  const getLikeKey = (post: Post) => post.db_id ?? `local-${post.id}`;

  // On login: hydrate liked posts from Supabase (merge with any local likes).
  // Also record which IDs came from the DB so the display formula can avoid double-counting:
  // post.likes from the DB already includes the user's own like.
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    const hydrateLikedPosts = () => {
      getUserLikedPostIds(userId).then(({ data, error }) => {
        if (error) {
          reportServiceError(error, { label: 'your liked posts', retry: hydrateLikedPosts });
          return;
        }
        if (!data?.length) return;
        const ids = new Set(data as string[]);
        setHydratedLikedIds(ids);
        setLikedPosts(prev => new Set([...prev, ...data]));
      });
    };
    hydrateLikedPosts();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep localStorage in sync (only save non-UUID keys — local/mock likes)
  useEffect(() => {
    try {
      const local = [...likedPosts].filter(k => !isUUID(k));
      localStorage.setItem('gazua:local_post_likes', JSON.stringify(local));
    } catch {}
  }, [likedPosts]);

  const toggleLike = async (post: Post) => {
    const key = getLikeKey(post);
    const wasLiked = likedPosts.has(key);

    // Optimistic update
    setLikedPosts(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(key) : next.add(key);
      return next;
    });

    // Persist to Supabase for DB-backed posts
    if (post.db_id && user) {
      const { error } = wasLiked
        ? await unlikePost(post.db_id, user.id)
        : await likePost(post.db_id, user.id);
      if (error) {
        console.error('[Like] toggle failed:', error);
        // Rollback
        setLikedPosts(prev => {
          const next = new Set(prev);
          wasLiked ? next.add(key) : next.delete(key);
          return next;
        });
      }
    }
  };

  // null while genuinely unavailable (no live market data configured, or the fetch failed) —
  // never fabricated, since this chart sits right next to a real price and would otherwise be
  // indistinguishable from it.
  const chartData = ticker ? liveChartData : defaultChartData;

  const posts = useMemo((): Post[] => {
    // Supabase returned real data — use it directly (filtering was done at the DB level).
    if (dbPosts !== null) return dbPosts;

    // Fallback: client-side filter over mock data.
    if (ticker) return MOCK_POSTS.filter(p => p.asset.toUpperCase() === ticker);
    let filtered = MOCK_POSTS;
    if (contentFilter !== 'All') {
      const cat = contentFilter === 'Beginner' ? 'Beginner Basics' : contentFilter;
      filtered = MOCK_POSTS.filter(p => p.category === cat);
    }
    if (!isOnboarded || onboardingData.interests.length === 0) return filtered.slice(0, 4);
    const matching = filtered.filter(p => onboardingData.interests.includes(p.category));
    const nonMatching = filtered.filter(p => !onboardingData.interests.includes(p.category));
    return [...matching, ...nonMatching].slice(0, 6);
  }, [dbPosts, ticker, contentFilter, isOnboarded, onboardingData.interests]);

  const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  const reelsPath = ticker ? `/main/reels?ticker=${ticker}` : '/main/reels';

  return (
    <div className="h-screen flex flex-col bg-white">
      <AppHeader />

      <div
        className="flex-1 overflow-hidden relative"
        {...swipeHandlers}
      >
        {/* Mobile backdrop */}
        <div
          className={`absolute inset-0 z-10 transition-opacity duration-300 lg:hidden ${
            isPanelOpen ? 'bg-black/40 pointer-events-auto' : 'bg-transparent pointer-events-none opacity-0'
          }`}
          onClick={closePanel}
        />

        <div className="h-full lg:max-w-[1600px] lg:mx-auto lg:flex lg:px-6">
          {/* Left Panel - Market Overview */}
          {/* Mobile: absolute overlay sliding in from left. Desktop: static flex child. */}
          <div
            className={[
              'absolute inset-y-0 left-0 w-screen z-20 bg-white overflow-y-auto',
              'border-r border-neutral-200 px-6 pt-4 pb-20',
              'transition-transform duration-300 ease-in-out',
              isPanelOpen ? 'translate-x-0' : '-translate-x-full',
              'lg:static lg:inset-auto lg:z-auto lg:flex-1 lg:translate-x-0 lg:pb-6',
            ].join(' ')}
          >
            {/* Back-navigation hint — mobile only, mirrors the open-panel handle on the feed */}
            <button
              onClick={closePanel}
              aria-label="Return to feed"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 lg:hidden
                         w-5 h-14 bg-neutral-100 rounded-l-full border border-r-0 border-neutral-200
                         flex items-center justify-center"
            >
              <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="mb-3">
              <div className="flex items-baseline gap-2 mb-1">
                <h2 className="text-3xl font-bold">
                  {tickerInfo?.price ?? '—'}
                </h2>
                <span className={`text-sm font-medium ${tickerInfo ? (tickerInfo.positive ? 'text-brand' : 'text-red-500') : 'text-neutral-400'}`}>
                  {tickerInfo ? `${tickerInfo.changeAmt} (${tickerInfo.change})` : ''}
                </span>
              </div>
              <p className="text-sm text-neutral-600">
                {ticker ? `$${ticker}` : 'S&P 500'}
              </p>
            </div>

            {/* Chart */}
            <div className="mb-4 bg-white rounded-md w-full">
              <div className="h-64 w-full">
                {chartData ? (
                  <ResponsiveContainer width="100%" height={256}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={['dataMin', 'dataMax']} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={chartCurrencyFormatter('Value')} labelFormatter={showChartLabel} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={tickerInfo && !tickerInfo.positive ? '#ef4444' : 'var(--brand)'}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <p className="text-sm text-neutral-400">Chart data unavailable right now.</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-4 py-4 text-xs">
                {timeRanges.map(range => (
                  <button
                    key={range}
                    onClick={() => setActiveTimeRange(range)}
                    className={`px-3 py-1 rounded transition-colors ${
                      activeTimeRange === range
                        ? 'bg-black text-white'
                        : 'hover:bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="space-y-3">
              {indicesLoading
                ? [1, 2, 3, 4].map(n => (
                    <div key={n} className="p-4 bg-neutral-50 rounded-md animate-pulse">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-3 bg-neutral-200 rounded w-20" />
                        <div className="h-3 bg-neutral-200 rounded w-12" />
                      </div>
                      <div className="h-5 bg-neutral-200 rounded w-24" />
                    </div>
                  ))
                : liveIndices.map(index => (
                    <div key={index.id} className="p-4 bg-neutral-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-600">{index.name}</span>
                        <span className={`text-xs font-medium ${index.positive ? 'text-brand' : 'text-red-500'}`}>{index.change}</span>
                      </div>
                      <p className="text-xl font-bold mt-1">{index.value}</p>
                    </div>
                  ))
              }
            </div>

            {/* Personalized Banner */}
            <div className="mt-4 p-4 bg-mint rounded-md">
              <h3 className="font-bold mb-1">
                {isOnboarded && onboardingData.riskStyle
                  ? `${onboardingData.riskStyle === 'conservative' ? 'Safe & Steady' : onboardingData.riskStyle === 'balanced' ? 'Balanced Growth' : onboardingData.riskStyle === 'aggressive' ? 'High Growth' : 'High Risk, High Reward'} Resources`
                  : 'Get more out of Gazua'}
              </h3>
              <p className="text-sm mb-3">
                {isOnboarded && onboardingData.riskStyle
                  ? onboardingData.riskStyle === 'conservative'
                    ? 'Explore low-risk investment strategies and stable income opportunities.'
                    : onboardingData.riskStyle === 'balanced'
                    ? 'Find the right mix of growth and stability for your portfolio.'
                    : onboardingData.riskStyle === 'aggressive'
                    ? 'Discover high-growth opportunities and dynamic trading strategies.'
                    : 'Learn about speculative investments and advanced trading techniques.'
                  : 'Options let you hedge, generate income, or trade based on your market outlook.'}
              </p>
            </div>
          </div>

          {/* Right Panel - Feed */}
          <div className="h-full w-full overflow-y-auto relative lg:w-[480px]">
            {/* Drag handle — mobile only, hints that chart panel is swipeable */}
            <button
              onClick={openPanel}
              aria-label="Show market chart"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 lg:hidden
                         w-5 h-14 bg-neutral-100 rounded-r-full border border-l-0 border-neutral-200
                         flex items-center justify-center"
            >
              <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Tabs */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 pt-6 pb-0 z-10">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('posting')}
                  className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'posting' ? 'border-black text-black' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
                >
                  Posting
                </button>
                <button
                  onClick={() => { setActiveTab('reels'); navigate(reelsPath); }}
                  className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'reels' ? 'border-black text-black' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
                >
                  Reels
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'following' ? 'border-black text-black' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
                >
                  Following
                </button>
              </div>

              {activeTab === 'posting' && !ticker && (
                <div className="px-6 pt-4 pb-2 flex items-center gap-2 overflow-x-auto">
                  {(['All', 'Stocks', 'ETFs', 'Crypto', 'Retirement', 'Options', 'News', 'Beginner'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setContentFilter(filter)}
                      className={`px-4 py-1.5 rounded-sm text-xs font-medium whitespace-nowrap transition-colors ${contentFilter === filter ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Posts */}
            <div className="p-6 space-y-4 pb-24 lg:pb-6">
              {/* ── Unified variables for both Posting and Following tabs ── */}
              {(() => {
                const isFollowingTab = activeTab === 'following';
                const activePostsLoading = isFollowingTab
                  ? followLoading || followingPostsLoading
                  : postsLoading;
                const activePosts = isFollowingTab ? (followingPosts ?? []) : posts;

                return (
                  <>
                    {/* ── Following tab: no followed creators yet ────────── */}
                    {isFollowingTab && !followLoading && followedIds.size === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                          <svg className="w-10 h-10 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Follow Creators to See Their Content</h3>
                        <p className="text-neutral-600 mb-6 max-w-sm">When you follow creators, their posts will appear here. Discover and follow investors who share your interests.</p>
                        <button onClick={() => setActiveTab('posting')} className="px-6 py-3 bg-black text-white rounded-sm hover:bg-black/90 transition-colors">
                          Explore All Posts
                        </button>
                      </div>
                    )}

                    {/* ── Posting tab: personalised onboarding banner ───────── */}
                    {!isFollowingTab && isOnboarded && onboardingData.level && activeTab === 'posting' && !ticker && !welcomeBannerDismissed && (
                      <div className="relative bg-gradient-to-r from-mint/10 to-emerald-500/10 border border-mint/30 rounded-md p-5 mb-6">
                        <button
                          onClick={dismissWelcomeBanner}
                          className="icon-tap-target absolute top-2 right-2 p-1.5 hover:bg-black/5 rounded-full transition-colors"
                          aria-label="Dismiss"
                        >
                          <CloseIcon sx={{ fontSize: 18 }} />
                        </button>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold mb-1 pr-6">
                              Welcome, {onboardingData.level === 'beginner' ? 'Explorer' : onboardingData.level === 'experienced' ? 'Analyst' : 'Expert'}! 🎉
                            </h3>
                            <p className="text-sm text-neutral-600">
                              {onboardingData.level === 'beginner' && "We've curated beginner-friendly content to help you start your investment journey."}
                              {onboardingData.level === 'experienced' && "Discover insights tailored to your investment experience."}
                              {onboardingData.level === 'confident' && "Explore advanced strategies and market analysis."}
                            </p>
                          </div>
                        </div>
                        {onboardingData.interests.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="text-xs text-neutral-600">Your interests:</span>
                            {onboardingData.interests.map(interest => (
                              <span key={interest} className="px-2 py-1 bg-mint/20 text-brand text-xs font-medium rounded-sm border border-mint/30">
                                {interest}
                              </span>
                            ))}
                          </div>
                        )}
                        {onboardingData.riskStyle && (
                          <div className="flex items-center gap-2 text-xs text-neutral-600">
                            <span>Investment style:</span>
                            <span className="px-2 py-1 bg-white/50 rounded font-medium capitalize">{onboardingData.riskStyle}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Loading skeleton ─────────────────────────────────── */}
                    {activePostsLoading && (
                      <div className="space-y-4">
                        {[1, 2, 3].map(n => (
                          <div key={n} className="bg-white border border-neutral-200 rounded-md p-5 animate-pulse">
                            <div className="flex items-start gap-2 mb-3">
                              <div className="w-10 h-10 rounded-full bg-neutral-200 flex-shrink-0" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 bg-neutral-200 rounded w-1/3" />
                                <div className="h-3 bg-neutral-200 rounded w-1/5" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="h-3 bg-neutral-200 rounded w-full" />
                              <div className="h-3 bg-neutral-200 rounded w-5/6" />
                              <div className="h-3 bg-neutral-200 rounded w-4/6" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Posting tab: empty states ─────────────────────────── */}
                    {!isFollowingTab && !postsLoading && posts.length === 0 && ticker && (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="text-neutral-500 text-sm">No posts tagged <span className="font-semibold">${ticker}</span> yet.</p>
                        <button onClick={() => setSearchParams({})} className="mt-4 text-sm font-medium underline hover:text-black transition-colors">
                          Clear filter
                        </button>
                      </div>
                    )}
                    {!isFollowingTab && !postsLoading && posts.length === 0 && contentFilter !== 'All' && !ticker && (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <p className="text-neutral-500 text-sm">No {contentFilter} posts yet.</p>
                        <button onClick={() => setContentFilter('All')} className="mt-4 text-sm font-medium underline hover:text-black transition-colors">
                          Clear filter
                        </button>
                      </div>
                    )}
                    {!isFollowingTab && !postsLoading && posts.length === 0 && contentFilter === 'All' && !ticker && (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <h3 className="text-xl font-bold mb-2">No posts yet</h3>
                        <p className="text-neutral-600 max-w-sm">Check back soon for new investing insights.</p>
                      </div>
                    )}

                    {/* ── Following tab: followed creators but no posts yet ──── */}
                    {isFollowingTab && !activePostsLoading && followedIds.size > 0 && activePosts.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2">No posts yet</h3>
                        <p className="text-neutral-600 max-w-sm">The creators you follow haven't posted anything yet. Check back soon!</p>
                      </div>
                    )}

                    {/* ── Post cards (shared between Posting and Following tabs) ── */}
                    {!activePostsLoading && activePosts.map(post => {
                      const likeKey = getLikeKey(post);
                      const isLiked = likedPosts.has(likeKey);
                      // post.likes from DB already includes the user's own like when hydrated.
                      // Subtract 1 for hydrated likes so we don't double-count; add 1 for new session likes.
                      const displayLikes = post.likes
                        + (isLiked ? 1 : 0)
                        - (hydratedLikedIds.has(likeKey) ? 1 : 0);
                      const isPostSaved = isSaved('post', post.db_id);
                      const algoLabel = derivePostLabel(post.likes, post.shares, post.verified, post.category);
                      return (
                        <div key={post.id} className="bg-white border border-neutral-200 rounded-md p-5 hover:border-neutral-300 transition-colors">
                          <div className="flex items-start gap-2 mb-3">
                            <button
                              onClick={() => navigate(`/profile/${post.creator_id}/investment`)}
                              className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-xl hover:opacity-80"
                            >
                              {post.avatar}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <button onClick={() => navigate(`/profile/${post.creator_id}/investment`)} className="font-bold text-sm hover:underline">
                                  {post.creator}
                                </button>
                                {post.verified && (
                                  <VerifiedBadge title="Portfolio allocation verified by Gazua" />
                                )}
                                <span className="text-xs text-neutral-500">• {post.created_at}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/main?ticker=${post.asset.toUpperCase()}`); }}
                                  className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition-colors"
                                >
                                  ${post.asset}
                                </button>
                                {isOnboarded && onboardingData.interests.includes(post.category) && (
                                  <span className="inline-block px-2 py-0.5 bg-mint/20 text-brand text-xs font-medium rounded border border-mint/30">✨ For you</span>
                                )}
                                {algoLabel && <AlgorithmicLabel label={algoLabel} />}
                              </div>
                            </div>
                            <ReportButton contentType="post" contentId={String(post.id)} />
                          </div>

                          <p className="text-sm mb-3 leading-relaxed">{post.content}</p>

                          {getCreator(post.creator_id) && (
                            <button
                              onClick={() => navigate(`/profile/${post.creator_id}/investment`)}
                              className="text-xs text-brand hover:underline mb-3 block"
                            >
                              See {post.creator}'s portfolio →
                            </button>
                          )}

                          <div className="flex items-center gap-2 text-neutral-500">
                            <button
                              onClick={() => toggleLike(post)}
                              className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
                            >
                              {isLiked
                                ? <FavoriteIcon sx={{ fontSize: 20 }} />
                                : <FavoriteBorderIcon sx={{ fontSize: 20 }} />
                              }
                              <span className="text-xs">{displayLikes}</span>
                            </button>
                            <button
                              onClick={() => {
                                if (window.innerWidth < 1024) {
                                  setMobileCommentPost({
                                    key: likeKey,
                                    dbId: post.db_id ?? '',
                                    title: post.content.slice(0, 80),
                                    initialCount: commentCounts[likeKey] ?? post.comments,
                                  });
                                } else {
                                  setExpandedCommentPostId(prev => prev === likeKey ? null : likeKey);
                                }
                              }}
                              className={`flex items-center gap-1.5 transition-colors ${expandedCommentPostId === likeKey ? 'text-blue-500' : 'hover:text-blue-500'}`}
                            >
                              <ChatBubbleOutlineIcon sx={{ fontSize: 20 }} />
                              <span className="text-xs">
                                {commentCounts[likeKey] ?? post.comments}
                              </span>
                            </button>
                            <button
                              onClick={() => handleShare(post)}
                              className="flex items-center gap-1.5 hover:text-green-500 transition-colors"
                            >
                              <ShareIcon sx={{ fontSize: 20 }} />
                              <span className="text-xs">{shareCounts[getLikeKey(post)] ?? post.shares}</span>
                            </button>
                            <button
                              onClick={() => handleSaveToWatchlist(post)}
                              className={`ml-auto transition-colors flex items-center gap-1.5 ${isPostSaved ? 'text-brand' : 'hover:text-brand'}`}
                              title={isPostSaved ? 'Remove from Watchlist' : 'Save to Watchlist'}
                            >
                              {isPostSaved ? (
                                <>
                                  <BookmarkIcon sx={{ fontSize: 20, color: 'var(--brand)' }} />
                                  <span className="text-xs text-brand">Saved</span>
                                </>
                              ) : (
                                <>
                                  <AddCircleOutlineIcon sx={{ fontSize: 20 }} />
                                  <span className="text-xs">Add to Watchlist</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className={`overflow-hidden transition-all duration-200 ${expandedCommentPostId === likeKey ? 'max-h-[600px]' : 'max-h-0'}`}>
                            <InlineComments
                              postId={post.db_id ?? ''}
                              initialCount={commentCounts[likeKey] ?? post.comments}
                              onCountChange={n => setCommentCounts(prev => ({ ...prev, [likeKey]: n }))}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
              <Footer />
            </div>
          </div>
        </div>
      </div>


      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 lg:bottom-8 bg-brand text-white px-6 py-4 rounded-md shadow-lg flex items-center gap-3 z-50 animate-slide-up pointer-events-none">
          <div>
            <p className="font-bold">{toastMessage}</p>
            {toastSubtitle && <p className="text-sm opacity-90">{toastSubtitle}</p>}
          </div>
        </div>
      )}

      {/* Mobile comment bottom sheet */}
      {mobileCommentPost && (
        <CommentPanel
          postId={mobileCommentPost.dbId}
          postTitle={mobileCommentPost.title}
          initialCount={mobileCommentPost.initialCount}
          onClose={() => setMobileCommentPost(null)}
          onCountChange={n =>
            setCommentCounts(prev => ({ ...prev, [mobileCommentPost.key]: n }))
          }
        />
      )}
    </div>
  );
}
