import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type TouchEvent, type WheelEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { AnimatePresence } from 'motion/react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import TuneIcon from '@mui/icons-material/Tune';
import AppHeader from './AppHeader';
import CreatorsSidebar from './CreatorsSidebar';
import ReelEngagementActions from './reels/ReelEngagementActions';
import { seedFromId } from './reels/format';
import CreatorsFilterSheet, { type Difficulty } from './creators/CreatorsFilterSheet';
import {
  getCreator,
  nameToCreatorId,
  type CreatorCard as Creator,
  FEATURED_CREATORS,
  TRENDING_CREATORS,
  BEGINNER_EDUCATORS,
  QUANT_BUILDERS,
  STOCK_PICKERS,
  CRYPTO_VOICES,
  RETIREMENT_EXPERTS,
} from '../data/creators';
import { CREATOR_VIDEOS } from '../data/reels';
import { useFollow, isUUID } from '../contexts/FollowContext';
import { useAuth } from '../contexts/AuthContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { searchCreators, matchesCreatorSearch } from '../utils/creatorSearch';
import type { SavedContentInput } from '../contexts/SavedContentContext';
import { getCreators } from '../../lib/services/profiles.service';
import { getFollowerCounts } from '../../lib/services/follows.service';
import { getReels, getVideos } from '../../lib/services/reels.service';
import { formatCount, formatDurationSeconds } from './reels/format';
import type { Profile, FeaturedCategory, ReelWithCreator, VideoWithCreator } from '../../types/database';
import { BUCKETS, getPublicUrl } from '../../lib/storage';

interface VideoItem {
  id: string;
  title: string;
  creator: string;
  creatorRouteSlug: string;
  creatorAvatar: string;
  creatorVerified: boolean;
  hasProfile: boolean;
  thumbnail: string;
  duration: string;
  views: string;
  uploadedAt: string;
}

interface ContentItem {
  id: number;
  type: 'reel' | 'post' | 'model';
  thumbnail: string;
  /** Bucket-relative path to a real uploaded video — present for DB-backed reels. */
  storage_path?: string;
  title: string;
  creator: string;
  views?: string;
  duration?: string;
}

const FEATURED_REEL_FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
];

// Maps a creator's featured_category (real DB profiles) onto the 3-tier difficulty scale
// this page has always grouped creators into — same grouping the old single-select filter
// used, now reusable for both the desktop pill row and the mobile filter sheet's multi-select.
const CATEGORY_TO_DIFFICULTY: Partial<Record<FeaturedCategory, Difficulty>> = {
  beginner_educator: 'Beginner',
  featured: 'Intermediate',
  trending: 'Intermediate',
  stock_picker: 'Intermediate',
  retirement_expert: 'Intermediate',
  quant_builder: 'Advanced',
  crypto_voice: 'Advanced',
};

const MOBILE_TABS = [
  { key: 'creators', label: 'Creators' },
  { key: 'reels', label: 'Reels' },
  { key: 'videos', label: 'Videos' },
] as const;
type MobileTabKey = (typeof MOBILE_TABS)[number]['key'];

type SavedItemMeta = Omit<SavedContentInput, 'userId'>;

export default function CreatorsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { followedIds, isFollowing: isFollowingFn, toggleFollow } = useFollow();

  // Shared filter state — desktop's 5 pill buttons and mobile's filter sheet both write into
  // this same pair (desktop always sets a single difficulty exclusively; mobile allows
  // combining multiple), so both surfaces stay consistent with one source of truth.
  const [difficultyFilters, setDifficultyFilters] = useState<Set<Difficulty>>(new Set());
  const [myFollowingOnly, setMyFollowingOnly] = useState(false);

  // Mobile-only: which of the 3 swipeable panels is active, and the difficulty filter sheet.
  const [mobileTab, setMobileTab] = useState<MobileTabKey>('reels');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const swipeTrackRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Search — driven by the top search bar (SearchModal), which syncs ?q= here while the user
  // is on this page. Debounced locally too so re-filtering doesn't run on every keystroke.
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);
  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const [playingReelIndex, setPlayingReelIndex] = useState<number | null>(null);
  const [isReelPreviewMuted, setIsReelPreviewMuted] = useState(true);
  const wheelLockRef = useRef(false);
  // Mock like state, keyed by reel id — this preview modal's reel items have no db_id to
  // persist against (they're a page-local content list, not the shared Reel/Video models).
  const [likedReelIds, setLikedReelIds] = useState<Set<number>>(new Set());
  // Desktop adjacent comments panel — a real flex sibling next to the reel card (not an
  // overlay). Only one reel plays at a time in this modal, so no "active index" bookkeeping
  // is needed here the way MainPageReels needs it for its scrolling feed.
  const [commentsPortalEl, setCommentsPortalEl] = useState<HTMLDivElement | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  // Desktop-only single-select filter row (All/Beginner/Intermediate/Advanced/My Following) —
  // each button fully replaces difficultyFilters/myFollowingOnly, so desktop's behavior stays
  // exactly as before even though the underlying state now supports mobile's multi-select.
  const DESKTOP_FILTERS = ['All', 'Beginner', 'Intermediate', 'Advanced', 'My Following'] as const;
  const isDesktopFilterActive = (filter: (typeof DESKTOP_FILTERS)[number]) => {
    if (filter === 'All') return difficultyFilters.size === 0 && !myFollowingOnly;
    if (filter === 'My Following') return myFollowingOnly;
    return myFollowingOnly === false && difficultyFilters.size === 1 && difficultyFilters.has(filter);
  };
  const selectDesktopFilter = (filter: (typeof DESKTOP_FILTERS)[number]) => {
    if (filter === 'All') { setDifficultyFilters(new Set()); setMyFollowingOnly(false); }
    else if (filter === 'My Following') { setDifficultyFilters(new Set()); setMyFollowingOnly(true); }
    else { setDifficultyFilters(new Set([filter])); setMyFollowingOnly(false); }
  };

  // Skill-level groupings built from the shared creator dataset (src/app/data/creators.ts)
  // so this page routes to real profiles and matches the rest of the app.
  const sectionTitle = debouncedSearchQuery.trim()
    ? 'Search Results'
    : myFollowingOnly
    ? 'My Following'
    : difficultyFilters.size === 1 && difficultyFilters.has('Beginner')
    ? 'Beginner Educators'
    : difficultyFilters.size === 1 && difficultyFilters.has('Intermediate')
    ? 'Popular Creators'
    : difficultyFilters.size === 1 && difficultyFilters.has('Advanced')
    ? 'Advanced & Specialized'
    : 'Featured Creators';

  // Real Supabase creator directory. null = not yet resolved / error (use mock fallback);
  // [] is a legitimate real empty result and is NOT treated as a fallback signal.
  const [dbProfiles, setDbProfiles] = useState<Profile[] | null>(null);
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>({});
  // Gates the initial render so real data doesn't flash-replace mock data a moment after
  // paint — mirrors the reelsLoading/postsLoading pattern in MainPageReels/MainPagePosting.
  const [creatorsLoading, setCreatorsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCreators({ limit: 100 }).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) { setDbProfiles(null); setCreatorsLoading(false); return; }
      setDbProfiles(data);
      getFollowerCounts(data.map(p => p.id)).then(({ data: counts }) => {
        if (cancelled) return;
        setFollowerCounts(counts ?? {});
        setCreatorsLoading(false);
      });
    });
    return () => { cancelled = true; };
  }, []);

  // Real reels for the "Featured Content" showcase. null = not yet resolved / error (use mock
  // fallback); [] is a legitimate real empty result and is shown as-is, matching dbProfiles above.
  const [dbReels, setDbReels] = useState<ReelWithCreator[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReels({ limit: 5 }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setDbReels(null); return; }
      setDbReels(data ?? []);
    });
    return () => { cancelled = true; };
  }, []);

  // Real long-form videos for the "Videos" rail. Same null/[] convention as dbReels above.
  const [dbVideos, setDbVideos] = useState<VideoWithCreator[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVideos({ limit: 20 }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setDbVideos(null); return; }
      setDbVideos(data ?? []);
    });
    return () => { cancelled = true; };
  }, []);

  // Maps a real profile row onto the same CreatorCard shape every card/search/follow
  // helper already consumes, so none of that logic needs to know whether it's looking at
  // real or mock data.
  const profileToCreatorCard = (p: Profile): Creator => ({
    id: p.id,
    name: p.full_name,
    avatar: p.avatar_url ?? '👤',
    tagline: p.tagline || (p.bio ? p.bio.slice(0, 100) : ''),
    focus: p.focus ?? '',
    followers: formatCount(followerCounts[p.id] ?? 0),
    tags: p.tags,
    verified: p.is_verified,
  });

  // Real UUID when this card is DB-backed (so Follow persists to Supabase via FollowContext's
  // isUUID branch), else the slug scheme mock creators have always used.
  const followTargetId = (creator: Creator): string =>
    typeof creator.id === 'string' && isUUID(creator.id) ? creator.id : nameToCreatorId(creator.name);

  const allCreators: Creator[] = useMemo(() => {
    if (dbProfiles !== null) return dbProfiles.map(profileToCreatorCard);
    return [
      ...FEATURED_CREATORS,
      ...TRENDING_CREATORS,
      ...BEGINNER_EDUCATORS,
      ...QUANT_BUILDERS,
      ...STOCK_PICKERS,
      ...CRYPTO_VOICES,
      ...RETIREMENT_EXPERTS,
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbProfiles, followerCounts]);

  // slug/UUID -> difficulty tier, built from whichever creator source is active. Keyed the same
  // way followTargetId() normalizes creators (real UUID for DB creators, name-slug for mock),
  // so the same key can be reused to test reels/videos against their creator's tier below.
  const creatorDifficultyLookup = useMemo(() => {
    const map = new Map<string, Difficulty>();
    if (dbProfiles !== null) {
      dbProfiles.forEach(p => {
        const diff = p.featured_category ? CATEGORY_TO_DIFFICULTY[p.featured_category] : undefined;
        if (!diff) return;
        map.set(p.id, diff);
        map.set(p.username, diff);
      });
    } else {
      BEGINNER_EDUCATORS.forEach(c => map.set(nameToCreatorId(c.name), 'Beginner'));
      [...FEATURED_CREATORS, ...TRENDING_CREATORS, ...STOCK_PICKERS, ...RETIREMENT_EXPERTS]
        .forEach(c => map.set(nameToCreatorId(c.name), 'Intermediate'));
      [...QUANT_BUILDERS, ...CRYPTO_VOICES].forEach(c => map.set(nameToCreatorId(c.name), 'Advanced'));
    }
    return map;
  }, [dbProfiles]);

  const matchesDifficulty = (slug: string): boolean => {
    if (difficultyFilters.size === 0) return true;
    const diff = creatorDifficultyLookup.get(slug);
    return diff !== undefined && difficultyFilters.has(diff);
  };

  const isSearching = debouncedSearchQuery.trim().length > 0;

  // Shared by desktop's Featured Creators section and mobile's Creators panel — both apply
  // difficulty + My Following identically (desktop's buttons just never produce a multi-select
  // combination, so this reproduces the old single-select behavior exactly for desktop).
  const displayedCreators: Creator[] = useMemo(() => {
    if (isSearching) return searchCreators(allCreators, debouncedSearchQuery);
    let list = allCreators;
    if (myFollowingOnly) list = list.filter(c => followedIds.has(followTargetId(c)));
    if (difficultyFilters.size > 0) list = list.filter(c => matchesDifficulty(followTargetId(c)));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, debouncedSearchQuery, allCreators, myFollowingOnly, followedIds, difficultyFilters, creatorDifficultyLookup]);

  // Real reels when available (null = fetch failed, use mock; [] = genuinely no reels yet,
  // shown as-is — same convention as dbProfiles above).
  const featuredContent: ContentItem[] = useMemo(() => {
    if (dbReels === null) {
      return [
        { id: 1, type: 'reel', thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', title: 'Top 5 Stocks for 2026', creator: 'Alex Rodriguez', views: '24.5K', duration: '0:58' },
        { id: 2, type: 'reel', thumbnail: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', title: 'Bitcoin Bull Case Explained', creator: 'Crypto Katie', views: '18.2K', duration: '1:12' },
        { id: 3, type: 'reel', thumbnail: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', title: 'Beginner ETF Strategy', creator: 'David Park', views: '32.1K', duration: '0:45' },
        { id: 4, type: 'reel', thumbnail: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', title: 'Python Trading Bot Tutorial', creator: 'Mike Ross', views: '15.8K', duration: '2:34' },
        { id: 5, type: 'reel', thumbnail: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', title: 'Market Analysis: Tech Sector', creator: 'Sarah Chen', views: '21.3K', duration: '1:28' },
      ] as ContentItem[];
    }
    return dbReels.map((r, i): ContentItem => ({
      id: i + 1,
      type: 'reel',
      thumbnail: r.thumbnail_url ?? FEATURED_REEL_FALLBACK_GRADIENTS[i % FEATURED_REEL_FALLBACK_GRADIENTS.length],
      storage_path: r.storage_path ?? undefined,
      title: r.caption.slice(0, 60),
      creator: r.creator.full_name,
    }));
  }, [dbReels]);

  // Desktop's Featured Content rail — unchanged from before (only ever respected My Following,
  // never difficulty). Kept exactly as-is so desktop's behavior doesn't shift.
  const displayedContent: ContentItem[] = useMemo(() => {
    if (isSearching) {
      return featuredContent.filter(item =>
        matchesCreatorSearch({ title: item.title, creatorName: item.creator }, debouncedSearchQuery),
      );
    }
    if (!myFollowingOnly) return featuredContent;
    return featuredContent.filter(item => followedIds.has(nameToCreatorId(item.creator)));
  }, [isSearching, debouncedSearchQuery, myFollowingOnly, followedIds, featuredContent]);

  // Mobile's Reels panel — same source, but (unlike the desktop rail above) also respects the
  // difficulty filter, per the mobile filter sheet applying to whichever tab is active.
  const mobileReelsItems: ContentItem[] = useMemo(() => {
    if (isSearching) {
      return featuredContent.filter(item =>
        matchesCreatorSearch({ title: item.title, creatorName: item.creator }, debouncedSearchQuery),
      );
    }
    let list = featuredContent;
    if (myFollowingOnly) list = list.filter(item => followedIds.has(nameToCreatorId(item.creator)));
    if (difficultyFilters.size > 0) list = list.filter(item => matchesDifficulty(nameToCreatorId(item.creator)));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, debouncedSearchQuery, featuredContent, myFollowingOnly, followedIds, difficultyFilters, creatorDifficultyLookup]);

  // Real DB videos when available (null = fetch failed, use mock; [] = genuinely none yet,
  // shown as-is — same convention as dbReels/featuredContent above). Falls back to the shared
  // canonical CREATOR_VIDEOS catalog (src/app/data/reels.ts), same source the watch page and
  // creator profile pages use, so video ids and creator links stay consistent across the app.
  const allVideoItems: VideoItem[] = useMemo(() => {
    if (dbVideos !== null) {
      return dbVideos.map((v, i): VideoItem => ({
        id: v.id,
        title: v.title,
        creator: v.creator.full_name,
        creatorRouteSlug: v.creator.username,
        creatorAvatar: v.creator.avatar_url ?? '👤',
        creatorVerified: v.creator.is_verified,
        hasProfile: true,
        thumbnail: v.thumbnail_url ?? FEATURED_REEL_FALLBACK_GRADIENTS[i % FEATURED_REEL_FALLBACK_GRADIENTS.length],
        duration: formatDurationSeconds(v.duration_seconds ?? 0),
        views: formatCount(v.view_count),
        uploadedAt: new Date(v.created_at).toLocaleDateString(),
      }));
    }
    return CREATOR_VIDEOS.map((v): VideoItem => {
      const c = getCreator(v.creator_id);
      return {
        id: String(v.id),
        title: v.title,
        creator: c?.name ?? v.creator_id,
        creatorRouteSlug: v.creator_id,
        creatorAvatar: c?.avatar ?? '👤',
        creatorVerified: c?.verified ?? false,
        hasProfile: !!c,
        thumbnail: v.thumbnail,
        duration: v.duration,
        views: v.views,
        uploadedAt: v.uploaded_at,
      };
    });
  }, [dbVideos]);

  // Desktop's Videos rail — unchanged from before (never filtered by My Following or
  // difficulty, always just the first 4). Kept exactly as-is so desktop's behavior doesn't shift.
  const videos: VideoItem[] = useMemo(() => {
    if (!isSearching) return allVideoItems.slice(0, 4);
    return allVideoItems
      .filter(video => matchesCreatorSearch({ title: video.title, creatorName: video.creator }, debouncedSearchQuery))
      .slice(0, 4);
  }, [isSearching, debouncedSearchQuery, allVideoItems]);

  // Mobile's Videos panel — same source, uncapped (it's a full browsing tab, not a preview
  // rail) and, like the Reels panel above, also respects the difficulty filter.
  const mobileVideoItems: VideoItem[] = useMemo(() => {
    if (isSearching) {
      return allVideoItems.filter(video => matchesCreatorSearch({ title: video.title, creatorName: video.creator }, debouncedSearchQuery));
    }
    let list = allVideoItems;
    if (myFollowingOnly) list = list.filter(video => followedIds.has(video.creatorRouteSlug));
    if (difficultyFilters.size > 0) list = list.filter(video => matchesDifficulty(video.creatorRouteSlug));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, debouncedSearchQuery, allVideoItems, myFollowingOnly, followedIds, difficultyFilters, creatorDifficultyLookup]);

  const hasAnySearchResults = displayedCreators.length > 0 || displayedContent.length > 0 || videos.length > 0;

  const reelItems = featuredContent.filter(i => i.type === 'reel');

  // Deep-link support for My Profile's Saved tab: ?openReel=<id> auto-opens that reel in this
  // page's own player, then strips the param so it doesn't re-trigger on subsequent navigation
  // (e.g. Up/Down browsing to a different reel, or closing and reopening the player).
  useEffect(() => {
    const openReelId = searchParams.get('openReel');
    if (!openReelId) return;
    const index = reelItems.findIndex(i => String(i.id) === openReelId);
    if (index !== -1) setPlayingReelIndex(index);
    const next = new URLSearchParams(searchParams);
    next.delete('openReel');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // First-time "Scroll for more" hint — replaces the old dedicated up/down nav buttons.
  // Wheel/touch/keyboard navigation already exist below; the hint is just a one-time nudge
  // so the affordance isn't lost when the buttons are removed.
  const [showScrollHint, setShowScrollHint] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (playingReelIndex !== 0) return;
    try {
      if (localStorage.getItem('gazua:seen_reel_nav_hint')) return;
    } catch {}
    setShowScrollHint(true);
    const timer = setTimeout(() => setShowScrollHint(false), 2500);
    return () => clearTimeout(timer);
  }, [playingReelIndex]);

  const dismissScrollHint = () => {
    if (!showScrollHint) return;
    setShowScrollHint(false);
    try { localStorage.setItem('gazua:seen_reel_nav_hint', '1'); } catch {}
  };

  // Advances to the next/previous reel, wrapping around in both directions for a true infinite loop.
  // Driven by JS (not native scroll-snap) so it works reliably no matter where the cursor is over the modal.
  const advanceReel = (direction: 1 | -1) => {
    dismissScrollHint();
    setPlayingReelIndex(prev => {
      if (prev === null) return prev;
      return (prev + direction + reelItems.length) % reelItems.length;
    });
  };

  // Keyboard navigation (Up/Down to advance, Escape to close) — the direct replacement for
  // the removed dedicated nav buttons on desktop.
  useEffect(() => {
    if (playingReelIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); advanceReel(-1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); advanceReel(1); }
      else if (e.key === 'Escape') { setPlayingReelIndex(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingReelIndex]);

  const handleReelTouchStart = (e: TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleReelTouchEnd = (e: TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const delta = touchStartYRef.current - e.changedTouches[0].clientY;
    touchStartYRef.current = null;
    if (Math.abs(delta) < 40) return;
    advanceReel(delta > 0 ? 1 : -1);
  };

  const handleReelWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (wheelLockRef.current || Math.abs(e.deltaY) < 10) return;
    wheelLockRef.current = true;
    advanceReel(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => { wheelLockRef.current = false; }, 500);
  };

  // ── Mobile tab-and-swipe wiring ─────────────────────────────────────
  // Panels are laid out side by side in a native horizontal scroll-snap container so the
  // browser handles axis disambiguation for us — a mostly-vertical touch gesture scrolls a
  // panel's own overflow-y-auto content exactly like any normal scroll, and only a clearly
  // horizontal gesture pages between tabs. No custom touch-drag math, no double-scroll region.
  const prefersReducedMotion = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const scrollToTabIndex = (index: number, smooth: boolean) => {
    const track = swipeTrackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };

  const handleTabClick = (key: MobileTabKey) => {
    setMobileTab(key);
    scrollToTabIndex(MOBILE_TABS.findIndex(t => t.key === key), !prefersReducedMotion());
  };

  const handleTabListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const idx = MOBILE_TABS.findIndex(t => t.key === mobileTab);
    const nextIdx = e.key === 'ArrowRight' ? (idx + 1) % MOBILE_TABS.length : (idx - 1 + MOBILE_TABS.length) % MOBILE_TABS.length;
    handleTabClick(MOBILE_TABS[nextIdx].key);
    tabButtonRefs.current[nextIdx]?.focus();
  };

  // Keeps the toggle in sync when the change came from a swipe rather than a tap.
  const handleSwipeScroll = () => {
    const track = swipeTrackRef.current;
    if (!track || track.clientWidth === 0) return;
    const idx = Math.min(MOBILE_TABS.length - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth)));
    const key = MOBILE_TABS[idx].key;
    setMobileTab(prev => (prev === key ? prev : key));
  };

  // Snap to the default tab (Reels) before first paint so there's no visible flash of the
  // Creators panel on load.
  useLayoutEffect(() => {
    scrollToTabIndex(MOBILE_TABS.findIndex(t => t.key === mobileTab), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-snap (no animation) after a viewport/orientation change so panels stay aligned with
  // the active tab instead of landing mid-panel.
  useEffect(() => {
    const onResize = () => scrollToTabIndex(MOBILE_TABS.findIndex(t => t.key === mobileTab), false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileTab]);

  const toggleDifficulty = (level: Difficulty) => {
    setDifficultyFilters(prev => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  };

  const clearMobileFilters = () => {
    setDifficultyFilters(new Set());
    setMyFollowingOnly(false);
  };

  const mobileEmptyMessage = (kind: 'creators' | 'reels' | 'videos'): string => {
    if (isSearching) return `No ${kind} found for "${debouncedSearchQuery}"`;
    if (myFollowingOnly && !user) return 'Sign in to see your followed creators';
    if (myFollowingOnly) return `Follow creators to see their ${kind} here`;
    if (difficultyFilters.size > 0) return `No ${kind} match the selected filters`;
    return `No ${kind} yet. Check back soon!`;
  };

  const renderCreatorCard = (creator: Creator, opts: { fullWidth?: boolean } = {}) => {
    const creatorSlug = nameToCreatorId(creator.name);
    const followId = followTargetId(creator);
    const isFollowing = isFollowingFn(followId);
    // DB-backed creators always have a real profile route (getCreatorByUsername will find
    // them); mock fallback creators only have one if they're in the small MOCK_CREATORS set.
    const hasProfile = dbProfiles !== null ? true : !!getCreator(creatorSlug);

    return (
      <div key={creator.id} className={`${opts.fullWidth ? 'w-full' : 'flex-shrink-0 w-[min(78vw,300px)] sm:w-80'} border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors bg-white`}>
        <div className="flex items-start gap-4 mb-4">
          <div
            onClick={hasProfile ? () => navigate(`/profile/${creatorSlug}/investment`) : undefined}
            className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl flex-shrink-0 ${hasProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          >
            {creator.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3
                onClick={hasProfile ? () => navigate(`/profile/${creatorSlug}/investment`) : undefined}
                className={`font-bold text-lg truncate ${hasProfile ? 'cursor-pointer hover:underline' : ''}`}
              >
                {creator.name}
              </h3>
              {creator.verified && (
                <svg className="w-5 h-5 text-brand flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{creator.tagline}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-black">{creator.followers}</span>
              <span>followers</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {creator.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleFollow(followId)}
            className={`${hasProfile ? 'flex-1' : 'w-full'} px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isFollowing
                ? 'bg-gray-200 text-black hover:bg-gray-300'
                : 'bg-black text-white hover:bg-black/80'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          {hasProfile && (
            <button
              onClick={() => navigate(`/profile/${creatorSlug}/investment`)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              View
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleContentClick = (item: ContentItem) => {
    if (item.type === 'reel') setPlayingReelIndex(reelItems.findIndex(i => i.id === item.id));
    else if (item.type === 'model') navigate('/models');
    else navigate('/main');
  };

  const renderContentCard = (item: ContentItem, opts: { fullWidth?: boolean } = {}) => {
    const contentCreatorSlug = nameToCreatorId(item.creator);
    const contentHasProfile = !!getCreator(contentCreatorSlug);

    return (
      <div key={item.id} onClick={() => handleContentClick(item)} className={`${opts.fullWidth ? 'w-full' : 'flex-shrink-0 w-[min(48vw,220px)] sm:w-64'} group cursor-pointer`}>
        <div className="relative aspect-[9/16] rounded-xl overflow-hidden mb-3">
          <div
            className="absolute inset-0"
            style={{ background: item.thumbnail }}
          />

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
              <PlayArrowIcon sx={{ fontSize: 32, color: '#000000', marginLeft: '4px' }} />
            </div>
          </div>

          {item.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
              {item.duration}
            </div>
          )}

          {item.views && (
            <div className="absolute top-2 left-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
              {item.views} views
            </div>
          )}
        </div>

        <h3 className="font-medium text-sm mb-1 group-hover:text-brand transition-colors line-clamp-2">
          {item.title}
        </h3>
        <p
          onClick={contentHasProfile ? (e) => { e.stopPropagation(); navigate(`/profile/${contentCreatorSlug}/investment`); } : undefined}
          className={`text-xs text-gray-600 ${contentHasProfile ? 'cursor-pointer hover:underline hover:text-black' : ''}`}
        >
          {item.creator}
        </p>
      </div>
    );
  };

  const renderVideoCard = (video: VideoItem, opts: { fullWidth?: boolean } = {}) => {
    return (
      <div key={video.id} onClick={() => navigate(`/watch/${video.id}`)} className={`${opts.fullWidth ? 'w-full' : 'flex-shrink-0 w-[min(78vw,300px)] sm:w-80'} group cursor-pointer`}>
        <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
          <div
            className="absolute inset-0"
            style={{ background: video.thumbnail.startsWith('http') ? `url(${video.thumbnail})` : video.thumbnail, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
              <PlayArrowIcon sx={{ fontSize: 32, color: '#000000', marginLeft: '4px' }} />
            </div>
          </div>

          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
            {video.duration}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg flex-shrink-0">
            {video.creatorAvatar}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm mb-1 line-clamp-2 group-hover:text-brand transition-colors">
              {video.title}
            </h3>
            <div className="flex items-center gap-1 mb-0.5">
              <p
                onClick={video.hasProfile ? (e) => { e.stopPropagation(); navigate(`/profile/${video.creatorRouteSlug}/videos`); } : undefined}
                className={`text-xs text-gray-600 ${video.hasProfile ? 'cursor-pointer hover:underline hover:text-black' : ''}`}
              >
                {video.creator}
              </p>
              {video.creatorVerified && (
                <svg className="w-3 h-3 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-xs text-gray-600">
              {video.views} views • {video.uploadedAt}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const activeMobileFilterCount = difficultyFilters.size + (myFollowingOnly ? 1 : 0);

  return (
    <div className="h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex flex-1 min-h-0 items-stretch">
        <CreatorsSidebar />

        {/* Main Content */}
        <div className={`flex-1 min-w-0 bg-white overflow-hidden ${playingReelIndex === null ? 'lg:overflow-y-auto' : ''}`}>

          {/* ── Mobile (< lg): tab-and-swipe browsing ── */}
          <div className="lg:hidden h-full flex flex-col">
            <div className="flex items-center border-b border-gray-200 flex-shrink-0">
              <div
                role="tablist"
                aria-label="Content type"
                className="flex flex-1"
                onKeyDown={handleTabListKeyDown}
              >
                {MOBILE_TABS.map(({ key, label }, i) => (
                  <button
                    key={key}
                    ref={(el) => { tabButtonRefs.current[i] = el; }}
                    role="tab"
                    id={`creators-tab-${key}`}
                    aria-selected={mobileTab === key}
                    aria-controls={`creators-panel-${key}`}
                    tabIndex={mobileTab === key ? 0 : -1}
                    onClick={() => handleTabClick(key)}
                    className={`flex-1 py-3.5 text-sm text-center border-b-2 transition-colors ${
                      mobileTab === key ? 'border-black text-black font-semibold' : 'border-transparent text-gray-500 font-medium'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsFilterSheetOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isFilterSheetOpen}
                aria-label={`Filter by level${activeMobileFilterCount > 0 ? ` (${activeMobileFilterCount} active)` : ''}`}
                className="relative shrink-0 px-4 py-3.5 text-gray-600 hover:text-black transition-colors"
              >
                <TuneIcon sx={{ fontSize: 20 }} />
                {activeMobileFilterCount > 0 && (
                  <span className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-brand" />
                )}
              </button>
            </div>

            {isSearching && (
              <p className="text-sm text-gray-500 px-4 py-3 flex-shrink-0 border-b border-gray-100">
                Results for <span className="font-medium text-black">"{debouncedSearchQuery}"</span>
                {' · '}
                <button onClick={clearSearch} className="text-brand hover:underline">Clear</button>
              </p>
            )}

            <div
              ref={swipeTrackRef}
              onScroll={handleSwipeScroll}
              className="flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar overscroll-x-contain"
            >
              {/* Creators panel */}
              <div
                id="creators-panel-creators"
                role="tabpanel"
                aria-labelledby="creators-tab-creators"
                className="w-full h-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden"
              >
                <div className="px-4 py-4 pb-28">
                  {creatorsLoading ? (
                    <div className="flex flex-col gap-4">
                      {[1, 2, 3].map(n => (
                        <div key={n} className="w-full border border-gray-200 rounded-xl p-6 animate-pulse">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0" />
                            <div className="flex-1 space-y-2 pt-1">
                              <div className="h-4 bg-gray-200 rounded w-2/3" />
                              <div className="h-3 bg-gray-200 rounded w-full" />
                            </div>
                          </div>
                          <div className="h-9 bg-gray-200 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : displayedCreators.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-12">{mobileEmptyMessage('creators')}</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {displayedCreators.map((c) => renderCreatorCard(c, { fullWidth: true }))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reels panel */}
              <div
                id="creators-panel-reels"
                role="tabpanel"
                aria-labelledby="creators-tab-reels"
                className="w-full h-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden"
              >
                <div className="px-4 py-4 pb-28">
                  {mobileReelsItems.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-12">{mobileEmptyMessage('reels')}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {mobileReelsItems.map((item) => renderContentCard(item, { fullWidth: true }))}
                    </div>
                  )}
                </div>
              </div>

              {/* Videos panel */}
              <div
                id="creators-panel-videos"
                role="tabpanel"
                aria-labelledby="creators-tab-videos"
                className="w-full h-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden"
              >
                <div className="px-4 py-4 pb-28">
                  {mobileVideoItems.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-12">{mobileEmptyMessage('videos')}</p>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {mobileVideoItems.map((v) => renderVideoCard(v, { fullWidth: true }))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Desktop / tablet (>= lg): unchanged stacked layout ── */}
          <div className="hidden lg:block max-w-[1600px] mx-auto px-4 sm:px-6 py-12">
            {/* Hero */}
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold mb-4">Discover Finance Creators</h1>
              <p className="text-xl text-gray-600 mb-8">
                Learn from expert investors, traders, and educators sharing real strategies and market insights.
              </p>

              {/* Filter Tabs */}
              <div className="flex items-center justify-center gap-3">
                {DESKTOP_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => selectDesktopFilter(filter)}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all shrink-0 ${
                      isDesktopFilterActive(filter)
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {isSearching && (
                <p className="text-sm text-gray-500 mt-4">
                  Showing results for <span className="font-medium text-black">"{debouncedSearchQuery}"</span>
                  {' · '}
                  <button onClick={clearSearch} className="text-brand hover:underline">Clear</button>
                </p>
              )}
            </div>

            {isSearching && !hasAnySearchResults ? (
              <p className="text-center text-gray-500 text-sm py-12">
                No results found for "{debouncedSearchQuery}"
              </p>
            ) : (
              <>
                {/* Featured Creators */}
                {(!isSearching || displayedCreators.length > 0) && (
                  <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 text-center">{sectionTitle}</h2>
                    {creatorsLoading ? (
                      <div className="max-w-[1328px] mx-auto flex gap-4 overflow-x-auto pb-2" style={{ justifyContent: 'safe center' }}>
                        {[1, 2, 3].map(n => (
                          <div key={n} className="flex-shrink-0 w-[min(78vw,300px)] sm:w-80 border border-gray-200 rounded-xl p-6 animate-pulse">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0" />
                              <div className="flex-1 space-y-2 pt-1">
                                <div className="h-4 bg-gray-200 rounded w-2/3" />
                                <div className="h-3 bg-gray-200 rounded w-full" />
                              </div>
                            </div>
                            <div className="h-9 bg-gray-200 rounded-full" />
                          </div>
                        ))}
                      </div>
                    ) : myFollowingOnly && !user && !isSearching ? (
                      <p className="text-center text-gray-500 text-sm">Sign in to see your followed creators</p>
                    ) : myFollowingOnly && displayedCreators.length === 0 && !isSearching ? (
                      <p className="text-center text-gray-500 text-sm">Follow creators to see them here</p>
                    ) : (
                      <div className="max-w-[1328px] mx-auto flex gap-4 overflow-x-auto pb-2" style={{ justifyContent: 'safe center' }}>
                        {displayedCreators.map((c) => renderCreatorCard(c))}
                      </div>
                    )}
                  </section>
                )}

                {/* Featured Content */}
                {(!isSearching || displayedContent.length > 0) && (
                  <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 text-center">Featured Content</h2>
                    {myFollowingOnly && !user && !isSearching ? (
                      <p className="text-center text-gray-500 text-sm">Sign in to see your followed creators</p>
                    ) : myFollowingOnly && displayedContent.length === 0 && !isSearching ? (
                      <p className="text-center text-gray-500 text-sm">Follow creators to see them here</p>
                    ) : displayedContent.length === 0 ? (
                      <p className="text-center text-gray-500 text-sm">No reels yet. Check back soon!</p>
                    ) : (
                      <div className="max-w-[1344px] mx-auto flex gap-4 overflow-x-auto pb-2" style={{ justifyContent: 'safe center' }}>
                        {displayedContent.map((item) => renderContentCard(item))}
                      </div>
                    )}
                  </section>
                )}

                {/* Videos */}
                {(!isSearching || videos.length > 0) && (
                  <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 text-center">Videos</h2>
                    {videos.length === 0 ? (
                      <p className="text-center text-gray-500 text-sm">No videos yet. Check back soon!</p>
                    ) : (
                      <div className="max-w-[1328px] mx-auto flex gap-4 overflow-x-auto pb-2" style={{ justifyContent: 'safe center' }}>
                        {videos.map((v) => renderVideoCard(v))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Reel Player — plays in-place on this page as a scrollable, YouTube-Shorts-style feed ── */}
      {playingReelIndex !== null && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPlayingReelIndex(null)}
          onWheel={handleReelWheel}
          onTouchStart={handleReelTouchStart}
          onTouchEnd={handleReelTouchEnd}
        >
          {(() => {
            const reel = reelItems[playingReelIndex];
            const reelCreatorSlug = nameToCreatorId(reel.creator);
            const reelHasProfile = !!getCreator(reelCreatorSlug);
            const isReelFollowed = isFollowingFn(reelCreatorSlug);
            const isReelLiked = likedReelIds.has(reel.id);
            const likeCount = seedFromId(reel.id, 800, 4000) + (isReelLiked ? 1 : 0);
            const toggleReelLike = () => {
              setLikedReelIds(prev => {
                const next = new Set(prev);
                next.has(reel.id) ? next.delete(reel.id) : next.add(reel.id);
                return next;
              });
            };
            const savedItem: SavedItemMeta = {
              contentId: `creators-reels:${reel.id}`,
              contentType: 'reel',
              surface: 'creators-reels',
              rawId: String(reel.id),
              title: reel.title,
              thumbnail: reel.thumbnail,
              creatorName: reel.creator,
              creatorId: reelHasProfile ? reelCreatorSlug : undefined,
              meta: reel.views ? `${reel.views} views` : undefined,
            };

            return (
              <>
              <div
                className="relative w-[min(24rem,calc(100vw-2rem))] h-[85vh] rounded-2xl overflow-hidden bg-black"
                style={reel.storage_path ? undefined : { background: reel.thumbnail.startsWith('http') ? `url(${reel.thumbnail})` : reel.thumbnail, backgroundSize: 'cover', backgroundPosition: 'center' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div key={reel.id} className="absolute inset-0">
                  {reel.storage_path ? (
                    <video
                      className="absolute inset-0 w-full h-full object-cover"
                      src={getPublicUrl(BUCKETS.reels, reel.storage_path)}
                      poster={reel.thumbnail.startsWith('http') ? reel.thumbnail : undefined}
                      muted={isReelPreviewMuted}
                      autoPlay
                      loop
                      playsInline
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                  {!reel.storage_path && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <PlayArrowIcon sx={{ fontSize: 40, color: '#ffffff' }} />
                      </div>
                    </div>
                  )}

                  {reel.storage_path && (
                    <button
                      onClick={() => setIsReelPreviewMuted(m => !m)}
                      aria-label={isReelPreviewMuted ? 'Unmute' : 'Mute'}
                      title={isReelPreviewMuted ? 'Unmute' : 'Mute'}
                      className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                    >
                      {isReelPreviewMuted ? <VolumeOffIcon sx={{ fontSize: 18 }} /> : <VolumeUpIcon sx={{ fontSize: 18 }} />}
                    </button>
                  )}

                  {reel.duration && (
                    <div className="absolute top-3 left-3 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded">
                      {reel.duration}
                    </div>
                  )}

                  <div className="absolute bottom-5 left-4 right-16 z-10">
                    <h3 className="text-white font-bold text-base mb-1">{reel.title}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={reelHasProfile ? () => { setPlayingReelIndex(null); navigate(`/profile/${reelCreatorSlug}/investment`); } : undefined}
                        className={`text-white/90 text-sm font-medium ${reelHasProfile ? 'hover:underline' : ''}`}
                      >
                        {reel.creator}
                      </button>
                      {reelHasProfile && (
                        <button
                          onClick={() => toggleFollow(reelCreatorSlug)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            isReelFollowed ? 'bg-white/20 text-white' : 'bg-white text-black hover:bg-white/90'
                          }`}
                        >
                          {isReelFollowed ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                    {reel.views && <p className="text-white/70 text-xs mb-2">{reel.views} views</p>}
                  </div>
                </div>

                <button
                  onClick={() => setPlayingReelIndex(null)}
                  className="absolute top-3 right-3 z-20 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <CloseIcon sx={{ fontSize: 18, color: '#ffffff' }} />
                </button>

                {/* First-time nudge — replaces the old dedicated up/down nav buttons, which
                    were removed since wheel/touch/keyboard navigation already cover this. */}
                {playingReelIndex === 0 && (
                  <div
                    className={`absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex justify-center pointer-events-none transition-opacity duration-500 ${
                      showScrollHint ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <span className="px-3 py-1.5 bg-black/50 rounded-full text-white/90 text-xs font-medium">
                      Scroll for more
                    </span>
                  </div>
                )}

                {/* Engagement rail — same shared components/state pattern as the main Reels
                    feed and the video watch page. All local/mock: this preview modal's reel
                    items have no db_id or ticker field to back real Like/Watchlist actions. */}
                <ReelEngagementActions
                  contentId={String(reel.id)}
                  isLiked={isReelLiked}
                  likeCount={likeCount}
                  onToggleLike={toggleReelLike}
                  commentSeed={seedFromId(reel.id, 5, 60)}
                  commentsContentType="reel"
                  commentsContentDbId={null}
                  shareUrl={window.location.href}
                  shareTitle={reel.title}
                  onToast={(msg, subtitle) => toast(msg, subtitle ? { description: subtitle } : undefined)}
                  commentsPortalTarget={commentsPortalEl}
                  onCommentPanelOpenChange={setIsCommentsOpen}
                  railClassName="absolute right-3 top-1/2 -translate-y-1/2 z-20"
                  savedItem={savedItem}
                />
              </div>

              {/* Desktop adjacent comments panel slot. Deliberately position:absolute and
                  positioned via a calc() anchored to viewport-center — NOT a flex sibling of
                  the reel card. The reel above is centered purely by the backdrop's own
                  flex centering, so it never shifts regardless of whether this panel is
                  open, closed, or changes size; this panel independently places itself in
                  the empty space to the reel's right. */}
              <div
                ref={setCommentsPortalEl}
                className={
                  isCommentsOpen
                    ? 'hidden lg:block absolute top-1/2 -translate-y-1/2 left-[calc(50%+13rem)] z-10 w-[360px] h-[85vh]'
                    : 'hidden'
                }
                onClick={(e) => e.stopPropagation()}
              />
              </>
            );
          })()}
        </div>
      )}

      {/* ── Mobile difficulty filter sheet ── */}
      <AnimatePresence>
        {isFilterSheetOpen && (
          <CreatorsFilterSheet
            difficultyFilters={difficultyFilters}
            onToggleDifficulty={toggleDifficulty}
            myFollowingOnly={myFollowingOnly}
            onToggleMyFollowing={() => setMyFollowingOnly(v => !v)}
            onClear={clearMobileFilters}
            onClose={() => setIsFilterSheetOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
