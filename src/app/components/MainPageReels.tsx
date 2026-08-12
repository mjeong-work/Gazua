import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import AppHeader from './AppHeader';
import ReelEngagementActions from './reels/ReelEngagementActions';
import type { SavedContentInput } from '../contexts/SavedContentContext';
import { MOCK_REELS, type Reel } from '../data/reels';
import { getReels, getReelsByTicker, getReelsByCreatorIds, likeReel, unlikeReel, getUserLikedReelIds } from '../../lib/services/reels.service';
import { reportServiceError } from '../hooks/useServiceQuery';
import type { ReelWithCreator as DbReel } from '../../types/database';
import { useFollow, isUUID } from '../contexts/FollowContext';
import { useAuth } from '../contexts/AuthContext';
import { MARKET_INDICES } from '../data/marketData';
import { getMarketIndices, getTickerInfo, getLiveTickerChart, type LiveTickerInfo } from '../../lib/market.service';
import type { MarketIndex } from '../data/marketData';
import { useWatchlist } from '../contexts/WatchlistContext';
import { getCreator } from '../data/creators';
import { isCreatorVerified } from '../utils/creator';
import VerifiedBadge from './VerifiedBadge';
import { useSwipePanel } from '../hooks/useSwipePanel';
import { BUCKETS, getPublicUrl } from '../../lib/storage';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
type SavedItemMeta = Omit<SavedContentInput, 'userId'>;

// Fallback gradients used when the DB reel has no thumbnail_url yet.
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
];

function normalizeDbReel(r: DbReel, index: number): Reel {
  return {
    id: index,
    db_id: r.id,   // preserve Supabase UUID for like persistence
    creator: r.creator.full_name,
    creator_id: r.creator.username,          // used for navigation
    creator_db_id: r.creator.id,             // UUID — used for follow operations
    handle: r.creator.handle ? `@${r.creator.handle}` : `@${r.creator.username}`,
    avatar: (r.creator.full_name?.[0] ?? '?').toUpperCase(),
    verified: isCreatorVerified(r.creator),
    caption: r.caption,
    // Raw thumbnail_url (or a CSS gradient fallback) — wrapped in url(...) only where used as a
    // CSS `background` value; used as-is for <video poster>.
    thumbnail: r.thumbnail_url ?? FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length],
    storage_path: r.storage_path ?? undefined,
    likes: r.like_count,
    comments: 0,
    shares: r.share_count,
    tickers: r.tickers,
  };
}

export default function MainPageReels() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const ticker = searchParams.get('ticker')?.toUpperCase() ?? null;

  const [activeTab, setActiveTab] = useState<'posting' | 'reels' | 'following'>('reels');
  const { addToWatchlist, removeBySource, isSaved } = useWatchlist();

  const { user } = useAuth();
  // ── Follow state ───────────────────────────────────────────────────
  const { followedIds, isFollowing: isFollowingFn, toggleFollow, isLoading: followLoading } = useFollow();
  const [followingReels, setFollowingReels] = useState<Reel[] | null>(null);
  const [followingReelsLoading, setFollowingReelsLoading] = useState(false);
  const [followingReelsRefreshKey, setFollowingReelsRefreshKey] = useState(0);

  // Like state — keyed by db_id (UUID) for DB reels, or 'local-{id}' for mock reels.
  const [likedReels, setLikedReels] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('gazua:local_reel_likes');
      return new Set(saved ? (JSON.parse(saved) as string[]) : []);
    } catch { return new Set(); }
  });
  const [activeIndex, setActiveIndex] = useState(0);
  // Comments now live entirely inside each reel's own container (see ReelInlineCommentsSheet)
  // rather than a page-level overlay — but the feed's own vertical scroll-snap still needs to
  // pause while a sheet is open, or swiping/scrolling would advance to the next reel out from
  // under it.
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Real <video> playback for DB-backed reels — one global mute state (not per-card) matches
  // standard short-form-feed UX; browsers require muted for autoplay so this starts true.
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('1M');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSubtitle, setToastSubtitle] = useState('');
  const { isPanelOpen, openPanel, closePanel, swipeHandlers } = useSwipePanel();

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

  // Supabase-backed reel data. null = not yet resolved (use mock fallback).
  const [dbReels, setDbReels] = useState<Reel[] | null>(null);
  const [reelsLoading, setReelsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setReelsLoading(true);

    const fetch = ticker
      ? getReelsByTicker(ticker, 20)
      : getReels({ limit: 20 });

    fetch.then(({ data, error }) => {
      if (cancelled) return;
      setReelsLoading(false);
      if (error || !data) {
        setDbReels(null); // signal: use mock fallback (error / no Supabase config)
        return;
      }
      setDbReels(data.map(normalizeDbReel)); // real result, possibly a real empty array
    });

    return () => { cancelled = true; };
  }, [ticker]);

  // ── Load reels for the Following tab ──────────────────────────────
  // Re-runs when the user switches to the following tab or changes their follow list.
  const followedIdsKey = Array.from(followedIds).sort().join(',');
  useEffect(() => {
    if (activeTab !== 'following') return;
    if (followLoading) return;

    // Only pass valid Supabase UUIDs — local mock-creator slugs/IDs are not
    // stored in the reels table and would cause a Supabase type error.
    const dbCreatorIds = Array.from(followedIds).filter(isUUID);
    if (!dbCreatorIds.length) {
      setFollowingReels([]);
      return;
    }

    let cancelled = false;
    setFollowingReelsLoading(true);

    getReelsByCreatorIds(dbCreatorIds).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        reportServiceError(error, {
          label: 'reels from creators you follow',
          retry: () => setFollowingReelsRefreshKey(k => k + 1),
        });
      }
      setFollowingReels(data ? data.map(normalizeDbReel) : []);
      setFollowingReelsLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeTab, followedIdsKey, followLoading, followingReelsRefreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredReels = useMemo((): Reel[] => {
    // Supabase returned real data — already filtered at the DB level.
    if (dbReels !== null) return dbReels;

    // Fallback: client-side filter over mock data.
    if (!ticker) return MOCK_REELS;
    return MOCK_REELS.filter(reel =>
      reel.tickers.map(t => t.toUpperCase()).includes(ticker)
    );
  }, [dbReels, ticker]);

  const triggerToast = (message: string, subtitle = '') => {
    setToastMessage(message);
    setToastSubtitle(subtitle);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Play the active reel's video, pause every other one.
  useEffect(() => {
    videoRefs.current.forEach((el, idx) => {
      if (idx === activeIndex) {
        el.play().catch(() => {}); // autoplay can reject if not yet muted/ready — harmless
      } else {
        el.pause();
        el.currentTime = 0;
      }
    });
  }, [activeIndex]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  // Helper: stable key per reel
  const getLikeKey = (reel: Reel) => reel.db_id ?? `local-${reel.id}`;

  // On login: hydrate liked reels from Supabase
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    const hydrateLikedReels = () => {
      getUserLikedReelIds(userId).then(({ data, error }) => {
        if (error) {
          reportServiceError(error, { label: 'your liked reels', retry: hydrateLikedReels });
          return;
        }
        if (!data?.length) return;
        setLikedReels(prev => new Set([...prev, ...data]));
      });
    };
    hydrateLikedReels();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep localStorage in sync (only non-UUID keys)
  useEffect(() => {
    try {
      const local = [...likedReels].filter(k => !isUUID(k));
      localStorage.setItem('gazua:local_reel_likes', JSON.stringify(local));
    } catch {}
  }, [likedReels]);

  const toggleLike = async (reel: Reel) => {
    const key = getLikeKey(reel);
    const wasLiked = likedReels.has(key);

    // Optimistic update
    setLikedReels(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(key) : next.add(key);
      return next;
    });

    // Persist to Supabase for DB-backed reels
    if (reel.db_id && user) {
      const { error } = wasLiked
        ? await unlikeReel(reel.db_id, user.id)
        : await likeReel(reel.db_id, user.id);
      if (error) {
        console.error('[Like] reel toggle failed:', error);
        setLikedReels(prev => {
          const next = new Set(prev);
          wasLiked ? next.add(key) : next.delete(key);
          return next;
        });
      }
    }
  };

  const handleSaveToWatchlist = async (reel: Reel) => {
    if (!isSaved('reel', reel.db_id)) {
      const ticker = reel.tickers[0] ?? reel.caption.match(/#([A-Za-z]{1,5})\b/)?.[1]?.toUpperCase() ?? '';
      if (!ticker) {
        triggerToast('Could not identify a ticker in this reel');
        return;
      }
      const saved = await addToWatchlist({
        ticker,
        name: reel.caption.substring(0, 60),
        assetType: 'Strategy',
        source_type: 'reel',
        source_content_id: reel.db_id,
        source: `Saved from reel by ${reel.creator}`,
      });
      if (saved) {
        triggerToast('Saved to Watchlist', 'Build your thesis in the Watchlist tab');
      }
    } else {
      removeBySource('reel', reel.db_id);
      triggerToast('Removed from Watchlist');
    }
  };

  // null while genuinely unavailable — never fabricated (see MainPagePosting.tsx's mirrored chart).
  const chartData = ticker ? liveChartData : defaultChartData;

  const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  const postingPath = ticker ? `/main?ticker=${ticker}` : '/main';

  return (
    <div className="h-[100dvh] flex flex-col bg-white">
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
              'absolute inset-y-0 left-0 w-[85vw] z-20 bg-white overflow-y-auto',
              'border-r border-neutral-200 px-6 pt-4 pb-20',
              'transition-transform duration-300 ease-in-out',
              isPanelOpen ? 'translate-x-0' : '-translate-x-full',
              'lg:static lg:inset-auto lg:z-auto lg:flex-1 lg:translate-x-0 lg:pb-6',
            ].join(' ')}
          >
            <div className="mb-6">
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
            <div className="mb-6 bg-white rounded-md w-full">
              <div className="h-64 w-full">
                {chartData ? (
                  <ResponsiveContainer width="100%" height={256}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="time" hide />
                      <YAxis hide domain={['dataMin', 'dataMax']} />
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

            {/* Ad Banner */}
            <div className="mt-6 p-4 bg-mint rounded-md">
              <h3 className="font-bold mb-1">Get more out of Gazua</h3>
              <p className="text-sm mb-3">Options let you hedge, generate income, or trade based on your market outlook.</p>
            </div>
          </div>

          {/* Right Panel - Reels */}
          <div className="h-full w-full bg-black relative flex flex-col lg:w-[480px] lg:flex-shrink-0">
            {/* Drag handle — mobile only */}
            <button
              onClick={openPanel}
              aria-label="Show market chart"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-30 lg:hidden
                         w-5 h-14 bg-white/20 rounded-r-full border border-l-0 border-white/20
                         flex items-center justify-center"
            >
              <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Tabs — fixed above the scroll container */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent px-6 pt-6 pb-12 z-30 pointer-events-none">
              <div className="flex gap-4 pointer-events-auto">
                <button
                  onClick={() => { setActiveTab('posting'); navigate(postingPath); }}
                  className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'posting' ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'}`}
                >
                  Posting
                </button>
                <button
                  onClick={() => setActiveTab('reels')}
                  className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'reels' ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'}`}
                >
                  Reels
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'following' ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'}`}
                >
                  Following
                </button>
              </div>
            </div>

            {/* Vertical scroll container */}
            {/* ── Following tab: no followed creators yet ─────────── */}
            {activeTab === 'following' && !followLoading && followedIds.size === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Follow Creators to See Their Reels</h3>
                <p className="text-white/60 text-sm mb-6 max-w-xs">When you follow creators, their reels will appear here.</p>
                <button
                  onClick={() => setActiveTab('reels')}
                  className="px-6 py-2.5 bg-white text-black font-bold text-sm rounded-sm hover:bg-white/90 transition-colors"
                >
                  Explore All Reels
                </button>
              </div>
            ) : (activeTab === 'following' ? followLoading || followingReelsLoading : reelsLoading) ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-white/60">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">Loading reels…</span>
                </div>
              </div>
            ) : activeTab === 'following' && followingReels !== null && followingReels.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Reels Yet</h3>
                <p className="text-white/60 text-sm mb-6 max-w-xs">The creators you follow haven't posted any reels yet. Check back soon!</p>
                <button
                  onClick={() => setActiveTab('reels')}
                  className="px-6 py-2.5 bg-white text-black font-bold text-sm rounded-sm hover:bg-white/90 transition-colors"
                >
                  Explore All Reels
                </button>
              </div>
            ) : activeTab === 'reels' && filteredReels.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <p className="text-white/70 text-sm mb-3">
                  {ticker
                    ? <>No reels tagged <span className="font-semibold text-white">${ticker}</span> yet.</>
                    : 'No reels yet. Check back soon!'}
                </p>
                {ticker && (
                  <button
                    onClick={() => setSearchParams({})}
                    className="text-sm text-white/70 underline hover:text-white transition-colors"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            ) : (
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={`h-full ${isCommentsOpen ? 'overflow-hidden' : 'overflow-y-scroll snap-y snap-mandatory'}`}
              >
                {(activeTab === 'following' ? (followingReels ?? []) : filteredReels).map((reel, index) => {
                  const isLiked = likedReels.has(getLikeKey(reel));
                  const isSavedReel = isSaved('reel', reel.db_id);
                  const hasProfile = !!getCreator(reel.creator_id);
                  const likeCount = reel.likes + (isLiked ? 1 : 0);
                  // UUID used for follow operations; falls back to undefined for mock reels
                  const followId = reel.creator_db_id;
                  const isReelCreatorFollowed = followId ? isFollowingFn(followId) : false;
                  const reelTicker = reel.tickers[0] ?? reel.caption.match(/#([A-Za-z]{1,5})\b/)?.[1]?.toUpperCase() ?? null;
                  const reelRawId = String(reel.db_id ?? reel.id);
                  const savedItem: SavedItemMeta = {
                    contentId: `home-reels:${reelRawId}`,
                    contentType: 'reel',
                    surface: 'home-reels',
                    rawId: reelRawId,
                    title: reel.caption.slice(0, 80),
                    thumbnail: reel.thumbnail,
                    creatorName: reel.creator,
                    creatorId: reel.creator_id,
                    meta: reel.handle,
                  };

                  return (
                    <div
                      key={reel.id}
                      className="relative h-full w-full overflow-hidden snap-start flex items-center justify-center"
                    >
                      {reel.storage_path ? (
                        <video
                          ref={(el) => {
                            if (el) {
                              videoRefs.current.set(index, el);
                              // Reels load asynchronously — by the time this element mounts,
                              // the activeIndex-driven effect below may have already run and
                              // won't fire again until activeIndex changes, so play here too.
                              if (index === activeIndex) el.play().catch(() => {});
                            } else {
                              videoRefs.current.delete(index);
                            }
                          }}
                          className="absolute inset-0 w-full h-full object-cover"
                          src={getPublicUrl(BUCKETS.reels, reel.storage_path)}
                          poster={reel.thumbnail.startsWith('http') ? reel.thumbnail : undefined}
                          muted={isMuted}
                          loop
                          playsInline
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: reel.thumbnail.startsWith('http') ? `url(${reel.thumbnail})` : reel.thumbnail,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                      {/* Play icon placeholder — only shown for reels with no real video yet */}
                      {!reel.storage_path && (
                        <div className="relative z-10 text-white text-center">
                          <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 mx-auto">
                            <VideoLibraryIcon sx={{ fontSize: 64, color: '#ffffff' }} />
                          </div>
                          <p className="text-sm opacity-70">Investment Education Reel</p>
                        </div>
                      )}

                      {/* Mute toggle — tap anywhere-on-video convention, but a dedicated small
                          button here keeps it from swallowing taps meant for the card underneath. */}
                      {reel.storage_path && (
                        <button
                          onClick={() => setIsMuted(m => !m)}
                          aria-label={isMuted ? 'Unmute' : 'Mute'}
                          title={isMuted ? 'Unmute' : 'Mute'}
                          className="absolute top-24 right-4 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                        >
                          {isMuted ? <VolumeOffIcon sx={{ fontSize: 18 }} /> : <VolumeUpIcon sx={{ fontSize: 18 }} />}
                        </button>
                      )}

                      {/* Creator info overlay — bottom-20 clears the 64px mobile bottom nav */}
                      <div className="absolute bottom-20 left-3 right-16 z-20 lg:bottom-10 lg:left-8 lg:right-24">
                        <div className="max-w-md">
                          <div className="flex items-center gap-3 mb-3">
                            <button
                              onClick={() => navigate(`/profile/${reel.creator_id}/videos`)}
                              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl hover:opacity-80"
                            >
                              {reel.avatar}
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => navigate(`/profile/${reel.creator_id}/videos`)}
                                  className="font-bold text-white hover:underline"
                                >
                                  {reel.creator}
                                </button>
                                {reel.verified && (
                                  <VerifiedBadge title="Portfolio allocation verified by Gazua" className="text-mint" />
                                )}
                              </div>
                              <button
                                onClick={() => navigate(`/profile/${reel.creator_id}/videos`)}
                                className="text-sm text-white/70 hover:underline text-left"
                              >
                                {reel.handle}
                              </button>
                            </div>
                            <button
                              onClick={() => followId && toggleFollow(followId)}
                              className={`px-6 py-2 font-bold text-sm rounded-sm transition-colors ${
                                isReelCreatorFollowed
                                  ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30'
                                  : 'bg-white text-black hover:bg-white/90'
                              }`}
                            >
                              {isReelCreatorFollowed ? 'Following' : 'Follow'}
                            </button>
                          </div>
                          <p className="text-white text-sm leading-relaxed">{reel.caption}</p>
                          {hasProfile && (
                            <button
                              onClick={() => navigate(`/profile/${reel.creator_id}/investment`)}
                              className="text-xs text-mint hover:underline mt-2 block"
                            >
                              See {reel.creator}'s portfolio →
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Interaction buttons — ReelEngagementActions positions its own rail
                          via railClassName; this keeps the comments sheet (a sibling within
                          the same component) a direct child of this reel card (the
                          position:relative container), not nested inside a small positioned
                          wrapper that would wrongly become the sheet's containing block. */}
                      <ReelEngagementActions
                        contentId={String(reel.id)}
                        isLiked={isLiked}
                        likeCount={likeCount}
                        onToggleLike={() => toggleLike(reel)}
                        commentSeed={reel.comments}
                        commentsContentType="reel"
                        commentsContentDbId={reel.db_id ?? null}
                        shareUrl={window.location.href}
                        shareTitle={reel.caption.slice(0, 80)}
                        ticker={reelTicker}
                        isTickerSaved={isSavedReel}
                        onToggleTickerSave={() => handleSaveToWatchlist(reel)}
                        onToast={(msg, subtitle) => triggerToast(msg, subtitle)}
                        isActive={index === activeIndex}
                        commentsDesktopMode="sheet"
                        onCommentPanelOpenChange={setIsCommentsOpen}
                        railClassName="absolute right-3 bottom-24 z-20 lg:right-6 lg:bottom-32"
                        savedItem={savedItem}
                      />
                    </div>
                  );
                })}
              </div>
            )}
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
    </div>
  );
}
