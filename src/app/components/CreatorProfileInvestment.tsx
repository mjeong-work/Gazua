import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ShareIcon from '@mui/icons-material/Share';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import SubscriptionModal from './SubscriptionModal';
import CreatorChatWidget from './CreatorChatWidget';
import AppHeader from './AppHeader';
import ContentDisclaimer from './compliance/ContentDisclaimer';
import { CHART_TOOLTIP_STYLE, chartCurrencyFormatter, hideChartLabel } from '../utils/chartTooltip';
import { getCreator, type MockCreator } from '../data/creators';
import { getCreatorByUsername, getFollowerCount } from '../../lib/services/profiles.service';
import { getPostCountByCreator, getPostsByCreator } from '../../lib/services/posts.service';
import { getCommentCount } from '../../lib/services/comments.service';
import { getFollowingCount } from '../../lib/services/follows.service';
import type { Profile, PostWithCreator } from '../../types/database';
import { useFollow } from '../contexts/FollowContext';
import { useAuth } from '../contexts/AuthContext';
import WatchingTab from './WatchingTab';
import { SUBSCRIBE_ENABLED, ACTUAL_PORTFOLIO_ENABLED } from '../featureFlags';

// Same 4-color default palette the hardcoded allocation used, extended for portfolios with
// more than 4 real slices.
const ALLOCATION_COLORS = ['#00a86b', '#7CFFB2', '#f43f5e', '#e5e7eb', '#60a5fa', '#a78bfa'];

interface DisplayPost {
  id: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  reposts: number;
  tag: string;
}

// Fallback content for the small MOCK_CREATORS set (no real posts.service data for them).
const MOCK_POSTS_FALLBACK: DisplayPost[] = [
  { id: 'mock-1', time: '2h ago', content: "Just added to my NVDA position. AI infrastructure spending isn't slowing down — data center capex from the hyperscalers is still accelerating. This is a multi-year theme, not a trade.", likes: 1240, comments: 87, reposts: 203, tag: '📈 Portfolio Update' },
  { id: 'mock-2', time: '1d ago', content: "Reminder: volatility is not risk. Risk is permanent loss of capital. A 20% drawdown in a fundamentally strong company is an opportunity, not a reason to panic sell. Zoom out.", likes: 3421, comments: 142, reposts: 891, tag: '💡 Investing Insight' },
  { id: 'mock-3', time: '3d ago', content: "Fed held rates steady again. My read: we're in a higher-for-longer environment through at least Q3. Positioning accordingly — overweight value, underweight long-duration growth. Cash is still earning 5%+, don't sleep on it.", likes: 2108, comments: 219, reposts: 445, tag: '🏦 Macro Watch' },
  { id: 'mock-4', time: '5d ago', content: "Q1 earnings recap: beat on revenue, missed on margins. Management guided conservatively for Q2 which I think is sandbagging. Holding my position. Full breakdown in my latest video — link in bio.", likes: 987, comments: 63, reposts: 134, tag: '📊 Earnings' },
  { id: 'mock-5', time: '1w ago', content: "New to investing? The single best thing you can do this year: set up automatic contributions to a low-cost index fund and stop watching the daily price. Time in market beats timing the market — every time.", likes: 5832, comments: 314, reposts: 2109, tag: '🎓 Beginner Tips' },
];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1d ago' : `${d}d ago`;
}

async function normalizeDbPost(p: PostWithCreator): Promise<DisplayPost> {
  const { data: commentCount } = await getCommentCount(p.id);
  return {
    id: p.id,
    time: formatRelativeTime(p.created_at),
    content: p.content,
    likes: p.like_count,
    comments: commentCount ?? 0,
    reposts: p.share_count,
    tag: p.category,
  };
}

// ── Component ─────────────────────────────────────────────────────────
export default function CreatorProfileInvestment() {
  const navigate = useNavigate();
  const { creatorId = 'alex-rodriguez' } = useParams<{ creatorId: string }>();
  const [searchParams] = useSearchParams();
  const { profile: authProfile } = useAuth();
  const mockCreator = getCreator(creatorId);

  // ── Remote data ────────────────────────────────────────────────────
  const [dbProfile, setDbProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [dbPosts, setDbPosts] = useState<DisplayPost[] | null>(null);

  // ── Own-profile detection ──────────────────────────────────────────
  const isOwnProfile = Boolean(authProfile?.username && authProfile.username === creatorId);

  // ── UI state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'investment' | 'videos' | 'posts' | 'about' | 'watching'>(() => {
    const t = searchParams.get('tab');
    if (t === 'watching') return 'watching';
    return 'investment';
  });
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(() => {
    try { return localStorage.getItem(`gazua:notif:${creatorId}`) === 'true'; } catch { return false; }
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // ── Investment tab (Figma placeholder — TODO: rebuild with real data) ──
  const [simulatorMode, setSimulatorMode] = useState(true);
  const [simulationExpanded, setSimulationExpanded] = useState(false);
  const [showSimulationList, setShowSimulationList] = useState(false);
  const [holdingsExpanded, setHoldingsExpanded] = useState(false);
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');

  const portfolioData = useMemo(() => {
    const points = { '1W': 7, '1M': 30, '3M': 90, '1Y': 252, 'ALL': 400 }[timeRange];
    const base = { '1W': 86000, '1M': 82000, '3M': 76000, '1Y': 62000, 'ALL': 45000 }[timeRange];
    let val = base;
    return Array.from({ length: points }, (_, i) => {
      val = val + (Math.random() - 0.45) * 800 + 30;
      return { time: `t${i}`, value: Math.max(val, base * 0.85) };
    });
  }, [timeRange]);

  // Reads the real profiles.portfolio_allocation Json column (shape: {name, value}[], colors
  // assigned by the frontend) when a creator has one set; falls back to the same default
  // breakdown shown before, since nothing writes to that column yet (no edit UI exists for
  // it — wiring one is a separate, larger feature, not part of this read-side connection).
  const allocationData = useMemo(() => {
    const raw = dbProfile?.portfolio_allocation;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((slice, i) => {
        const s = slice as { name?: unknown; value?: unknown };
        return {
          name: String(s.name ?? 'Other'),
          value: Number(s.value ?? 0),
          color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
        };
      });
    }
    return [
      { name: 'Stocks', value: 45, color: '#00a86b' },
      { name: 'ETFs', value: 30, color: '#7CFFB2' },
      { name: 'Crypto', value: 15, color: '#f43f5e' },
      { name: 'Cash', value: 10, color: '#e5e7eb' },
    ];
  }, [dbProfile]);

  // ── Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    setProfileLoading(true);
    getCreatorByUsername(creatorId).then(({ data }) => {
      setDbProfile(data);
      setProfileLoading(false);
      if (data) {
        getFollowerCount(data.id).then(({ data: n }) => { if (n !== null) setFollowerCount(n); });
        getFollowingCount(data.id).then(({ data: n }) => { if (n !== null) setFollowingCount(n); });
        getPostCountByCreator(data.id).then(({ data: n }) => { if (n !== null) setPostCount(n); });
        getPostsByCreator(data.id).then(({ data: posts, error }) => {
          if (error || !posts) return;
          Promise.all(posts.map(normalizeDbPost)).then(setDbPosts);
        });
      }
    });
  }, [creatorId]);

  const posts = dbProfile ? (dbPosts ?? []) : MOCK_POSTS_FALLBACK;

  // ── Derived data ───────────────────────────────────────────────────
  // Prefer DB data; keep mock values for counts not yet in DB
  const creator = useMemo((): MockCreator | null => {
    if (dbProfile) {
      return {
        id: dbProfile.username,
        name: dbProfile.full_name,
        handle: dbProfile.handle ? `@${dbProfile.handle}` : `@${dbProfile.username}`,
        avatar: mockCreator?.avatar ?? (dbProfile.full_name?.[0] ?? '?').toUpperCase(),
        bio: dbProfile.bio ?? mockCreator?.bio ?? '',
        verified: dbProfile.is_verified,
        followers: mockCreator?.followers ?? '—',
        following: mockCreator?.following ?? '—',
        posts: mockCreator?.posts ?? '—',
        focus: dbProfile.focus ?? mockCreator?.focus ?? '',
      };
    }
    return mockCreator;
  }, [dbProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Follow state ───────────────────────────────────────────────────
  const { isFollowing: isFollowingFn, toggleFollow } = useFollow();
  const followKey = dbProfile?.id ?? creatorId;
  const isFollowingCreator = isFollowingFn(followKey);
  const handleFollowToggle = async () => { await toggleFollow(followKey); };

  // ── Helpers ────────────────────────────────────────────────────────
  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).catch(() => {});
    triggerToast('Profile link copied to clipboard');
  };

  // ── Loading skeleton ───────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <AppHeader />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-16 mb-8" />
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-8">
              <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-3 pt-2">
                <div className="h-7 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-28" />
                <div className="flex gap-6 mt-2">
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-full max-w-lg mt-2" />
                <div className="h-4 bg-gray-200 rounded w-4/5 max-w-md" />
                <div className="flex gap-3 mt-4">
                  <div className="h-10 bg-gray-200 rounded-full w-24" />
                  <div className="h-10 bg-gray-200 rounded-full w-24" />
                  <div className="h-10 bg-gray-200 rounded-full w-24" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────
  if (!creator) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Creator not found</h2>
            <p className="text-gray-600 mb-4">This creator profile doesn't exist yet.</p>
            <button onClick={() => navigate('/creators')} className="px-6 py-3 bg-black text-white rounded-full hover:bg-black/80">
              Browse Creators
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="h-screen flex flex-col bg-white">
        <AppHeader />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 pt-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black">
              <ArrowBackIcon sx={{ fontSize: 16 }} />
              Back
            </button>
          </div>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8">

            {/* ── Profile Header ── */}
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-4xl sm:text-5xl flex-shrink-0">
                {creator.avatar}
              </div>
              <div className="flex-1 w-full">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-2xl sm:text-3xl font-bold">{creator.name}</h1>
                      {creator.verified && (
                        <span title="Portfolio allocation verified by Gazua" className="inline-flex">
                          <svg className="w-6 h-6 text-[#00a86b]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3">{creator.handle}</p>
                    <div className="flex items-center flex-wrap gap-3 sm:gap-6 text-sm mb-4">
                      <div>
                        <span className="font-bold text-lg">
                          {followerCount !== null ? followerCount.toLocaleString() : creator.followers}
                        </span>
                        <span className="text-gray-600 ml-1">followers</span>
                      </div>
                      <div>
                        <span className="font-bold text-lg">
                          {followingCount !== null ? followingCount.toLocaleString() : creator.following}
                        </span>
                        <span className="text-gray-600 ml-1">following</span>
                      </div>
                      <div>
                        <span className="font-bold text-lg">
                          {postCount !== null ? postCount.toLocaleString() : creator.posts}
                        </span>
                        <span className="text-gray-600 ml-1">posts</span>
                      </div>
                    </div>
                  </div>

                  {/* Action icons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const next = !notificationsOn;
                        setNotificationsOn(next);
                        try { localStorage.setItem(`gazua:notif:${creatorId}`, String(next)); } catch {}
                        triggerToast(next ? 'Notifications enabled for this creator' : 'Notifications turned off');
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Toggle notifications"
                    >
                      {notificationsOn
                        ? <NotificationsActiveIcon sx={{ fontSize: 20, color: '#00a86b' }} />
                        : <NotificationsIcon sx={{ fontSize: 20 }} />
                      }
                    </button>
                    <button onClick={handleShare} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Share profile">
                      <ShareIcon sx={{ fontSize: 20 }} />
                    </button>
                    <div className="relative">
                      <button onClick={() => setShowMoreMenu(v => !v)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <MoreHorizIcon sx={{ fontSize: 20 }} />
                      </button>
                      {showMoreMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-2 w-44 z-10" onMouseLeave={() => setShowMoreMenu(false)}>
                          <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { triggerToast('Report submitted'); setShowMoreMenu(false); }}>Report creator</button>
                          <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50" onClick={() => { triggerToast('Creator muted'); setShowMoreMenu(false); }}>Mute creator</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-sm leading-relaxed mb-6 max-w-2xl">{creator.bio}</p>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={handleFollowToggle}
                    className={`px-6 sm:px-8 py-2.5 font-medium text-sm rounded-full transition-colors ${isFollowingCreator ? 'bg-gray-200 text-black hover:bg-gray-300' : 'bg-black text-white hover:bg-black/80'}`}
                  >
                    {isFollowingCreator ? 'Following' : 'Follow'}
                  </button>
                  {SUBSCRIBE_ENABLED && (
                    <button
                      onClick={() => setShowSubscribeModal(true)}
                      className="px-6 sm:px-8 py-2.5 bg-[#7CFFB2] text-black font-medium text-sm rounded-full hover:bg-[#6EEEA8] transition-colors"
                    >
                      Subscribe
                    </button>
                  )}
                  {dbProfile && (
                    <button
                      onClick={() => setShowChat(true)}
                      className="px-5 sm:px-6 py-2.5 bg-gray-100 text-black font-medium text-sm rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Message
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="border-b border-gray-200 mb-6 sm:mb-8">
              <div className="flex gap-4 sm:gap-8 overflow-x-auto">
                {(['investment', 'videos', 'posts', 'about'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      if (tab === 'videos') navigate(`/profile/${creatorId}/videos`);
                    }}
                    className={`pb-4 px-1 font-medium text-sm border-b-2 capitalize transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {tab}
                  </button>
                ))}
                {isOwnProfile && (
                  <button
                    onClick={() => setActiveTab('watching')}
                    className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${activeTab === 'watching' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    Watching
                    <svg className="w-3 h-3 opacity-60" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* ── Investment Tab (Figma placeholder — TODO: rebuild with real data) ── */}
            {activeTab === 'investment' && (
            <div className="space-y-4">
              {/* Simulator Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <h3 className="font-medium text-sm mb-0.5">Portfolio Simulator</h3>
                  <p className="text-xs text-gray-500">Test hypothetical investment scenarios</p>
                </div>
                {ACTUAL_PORTFOLIO_ENABLED && (
                  <button
                    onClick={() => setSimulatorMode(!simulatorMode)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      simulatorMode ? 'bg-[#00a86b]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        simulatorMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
              </div>

              {simulatorMode ? (
                // Simulator View
                <div className="space-y-4">
                  {/* Simulation Settings */}
                  <div
                    onClick={() => setSimulationExpanded(!simulationExpanded)}
                    className="p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-semibold">Simulation Setup</h2>
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${simulationExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {!simulationExpanded ? (
                      // Collapsed Summary View
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Period:</span> Jan 1 - Jun 1, 2026 (5 months)
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Holdings:</span> 2 stocks (NVDA, TSLA) + Cash
                        </p>
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Capital:</span> $50,000
                        </p>
                      </div>
                    ) : (
                      // Expanded Detail View
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
                            <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs">
                              Jan 1, 2026
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Initial Capital</label>
                            <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs">
                              $50,000
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Hypothetical Holdings</label>
                          <div className="space-y-1.5">
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs flex items-center justify-between">
                              <span>NVDA - $30,000 @ $800/share</span>
                              <span className="text-gray-500">37.5 shares</span>
                            </div>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs flex items-center justify-between">
                              <span>TSLA - $15,000 @ $250/share</span>
                              <span className="text-gray-500">60 shares</span>
                            </div>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs flex items-center justify-between">
                              <span>Cash</span>
                              <span className="text-gray-500">$5,000</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Simulation Rationale</label>
                          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded">
                            <ul className="space-y-1 text-xs text-gray-600">
                              <li>• Testing AI chip sector growth thesis through NVDA exposure</li>
                              <li>• EV market diversification with TSLA position</li>
                              <li>• Conservative 10% cash buffer for volatility management</li>
                              <li>• 5-month timeframe to capture Q1-Q2 earnings cycles</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Performance Comparison */}
                  <div>
                    <h2 className="text-base font-semibold mb-3">Hypothesis vs Actual Performance</h2>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {/* Hypothesis */}
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-xs text-gray-600 mb-1">Your Hypothesis</p>
                        <p className="text-xl font-bold text-purple-700 mb-0.5">+15.0%</p>
                        <p className="text-xs text-gray-500">$57,500</p>
                      </div>

                      {/* Actual */}
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 mb-1">Actual Performance</p>
                        <p className="text-xl font-bold text-[#00a86b] mb-0.5">+8.5%</p>
                        <p className="text-xs text-gray-500">$54,250</p>
                      </div>

                      {/* Difference */}
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-gray-600 mb-1">Difference</p>
                        <p className="text-xl font-bold text-red-700 mb-0.5">-6.5%</p>
                        <p className="text-xs text-gray-500">-$3,250</p>
                      </div>
                    </div>

                    {/* Chart Comparison */}
                    <div className="bg-gray-50 rounded-lg p-4 w-full">
                      <div className="h-48 min-h-[192px] w-full min-w-[300px]">
                        <ResponsiveContainer width="100%" height={192} minWidth={300} minHeight={192} key="simulator-chart-container">
                          <LineChart id="simulator-chart" key="simulator-line-chart">
                            <XAxis dataKey="time" hide key="simulator-xaxis" />
                            <YAxis hide domain={['dataMin', 'dataMax']} key="simulator-yaxis" />
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={chartCurrencyFormatter('Value')} labelFormatter={hideChartLabel} />
                            <Line
                              data={portfolioData}
                              type="monotone"
                              dataKey="value"
                              stroke="#00a86b"
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={false}
                              key="simulator-actual-line"
                              name="Actual"
                            />
                            <Line
                              data={portfolioData.map((d, i) => ({ ...d, value: d.value * 1.06 }))}
                              type="monotone"
                              dataKey="value"
                              stroke="#9333ea"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              isAnimationActive={false}
                              key="simulator-hypothesis-line"
                              name="Hypothesis"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-0.5 bg-[#00a86b]"></div>
                          <span className="text-xs font-medium">Actual</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-0.5 bg-purple-700" style={{ borderTop: '2px dashed #9333ea', height: 0 }}></div>
                          <span className="text-xs font-medium">Hypothesis</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* More Simulations Button */}
                  <button
                    onClick={() => setShowSimulationList(!showSimulationList)}
                    className="w-full p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors flex items-center justify-center gap-2 text-xs font-medium text-gray-600"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {showSimulationList ? 'Hide Past Simulations' : 'View More Simulations'}
                  </button>

                  {/* Simulation List */}
                  {showSimulationList && (
                    <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-2.5">
                      <h3 className="font-semibold text-sm mb-3">Past Simulations</h3>

                      {/* Simulation 1 */}
                      <div className="p-3 bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-medium text-sm">Tech Growth Portfolio</h4>
                          <span className="text-xs text-gray-500">Dec 1, 2025 - Mar 1, 2026</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600 mb-1.5">
                          <span>3 Holdings</span>
                          <span>•</span>
                          <span>$75,000 Capital</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Hypothesis:</span>
                            <span className="font-medium text-purple-700">+22.0%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Actual:</span>
                            <span className="font-medium text-[#00a86b]">+18.5%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Diff:</span>
                            <span className="font-medium text-red-700">-3.5%</span>
                          </div>
                        </div>
                      </div>

                      {/* Simulation 2 */}
                      <div className="p-3 bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-medium text-sm">Conservative Value Play</h4>
                          <span className="text-xs text-gray-500">Sep 1, 2025 - Dec 1, 2025</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600 mb-1.5">
                          <span>4 Holdings</span>
                          <span>•</span>
                          <span>$100,000 Capital</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Hypothesis:</span>
                            <span className="font-medium text-purple-700">+8.0%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Actual:</span>
                            <span className="font-medium text-[#00a86b]">+11.2%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Diff:</span>
                            <span className="font-medium text-[#00a86b]">+3.2%</span>
                          </div>
                        </div>
                      </div>

                      {/* Simulation 3 */}
                      <div className="p-3 bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-medium text-sm">Crypto Diversification Test</h4>
                          <span className="text-xs text-gray-500">Jun 1, 2025 - Sep 1, 2025</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600 mb-1.5">
                          <span>5 Holdings</span>
                          <span>•</span>
                          <span>$25,000 Capital</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Hypothesis:</span>
                            <span className="font-medium text-purple-700">+35.0%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Actual:</span>
                            <span className="font-medium text-red-700">-5.2%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">Diff:</span>
                            <span className="font-medium text-red-700">-40.2%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Insights */}
                </div>
              ) : (
                // Real Portfolio View
                <div className="space-y-4">

              {/* Actual Portfolio Badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00a86b]/10 text-[#00a86b] text-xs font-semibold rounded-full border border-[#00a86b]/20">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Actual Portfolio
                </span>
                <span className="text-xs text-gray-400">Real positions · Updated daily</span>
              </div>

              {/* Top Holding Chart */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">Performance Chart</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-medium text-[#00a86b]">+2.66%</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 w-full">
                  <div className="h-48 min-h-[192px] w-full min-w-[300px]">
                    <ResponsiveContainer width="100%" height={192} minWidth={300} minHeight={192} key="portfolio-chart-container">
                      <LineChart data={portfolioData} id="portfolio-chart" key="portfolio-line-chart">
                        <XAxis dataKey="time" hide key="portfolio-xaxis" />
                        <YAxis hide domain={['dataMin', 'dataMax']} key="portfolio-yaxis" />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={chartCurrencyFormatter('Value')} labelFormatter={hideChartLabel} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#00a86b"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                          key="portfolio-line"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-3 text-xs font-medium">
                    {(['1W', '1M', '3M', '1Y', 'ALL'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          timeRange === r ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:bg-white hover:text-black'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Portfolio Allocation */}
              <div>
                <h2 className="text-base font-semibold mb-3">Portfolio Allocation</h2>
                <div className="flex items-center gap-8">
                  {/* Donut Chart */}
                  <div className="w-48 h-48 min-w-48 min-h-48">
                    <ResponsiveContainer width="100%" height="100%" minWidth={192} minHeight={192} key="allocation-chart-container">
                      <PieChart id="allocation-chart" key="allocation-pie-chart">
                        <Pie
                          data={allocationData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          isAnimationActive={false}
                          key="allocation-pie"
                        >
                          {allocationData.map((entry, index) => (
                            <Cell key={`allocation-cell-${entry.name}-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 space-y-3">
                    {allocationData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <span className="text-lg font-bold">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* My Holdings */}
              <div>
                {holdingsExpanded && (
                  <div className="bg-white rounded-lg border border-gray-200">
                    {/* Stock Item 1 */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xs">
                          NV
                        </div>
                        <div>
                          <p className="text-sm font-medium">NVDA</p>
                          <p className="text-xs text-gray-500">Nvidia Corp.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">$41,820.00</p>
                        <p className="text-xs text-[#00a86b]">+2.66%</p>
                      </div>
                    </div>

                    {/* Stock Item 2 */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs">
                          GO
                        </div>
                        <div>
                          <p className="text-sm font-medium">GOOG</p>
                          <p className="text-xs text-gray-500">Alphabet, Inc.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">$18,340.50</p>
                        <p className="text-xs text-[#00a86b]">+0.88%</p>
                      </div>
                    </div>

                    {/* Stock Item 3 */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center text-white font-bold text-xs">
                          MS
                        </div>
                        <div>
                          <p className="text-sm font-medium">MSFT</p>
                          <p className="text-xs text-gray-500">Microsoft Corp.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">$12,910.00</p>
                        <p className="text-xs text-red-600">-0.88%</p>
                      </div>
                    </div>

                    {/* Stock Item 4 */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-pink-500 rounded flex items-center justify-center text-white font-bold text-xs">
                          MT
                        </div>
                        <div>
                          <p className="text-sm font-medium">META</p>
                          <p className="text-xs text-gray-500">Meta Platforms, Inc.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">$9,560.00</p>
                        <p className="text-xs text-red-600">-1.24%</p>
                      </div>
                    </div>

                    {/* Stock Item 5 */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold text-xs">
                          TS
                        </div>
                        <div>
                          <p className="text-sm font-medium">TSLA</p>
                          <p className="text-xs text-gray-500">Tesla, Inc.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">$4,230.00</p>
                        <p className="text-xs text-[#00a86b]">+0.52%</p>
                      </div>
                    </div>

                    {/* Stock Item 6 */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-white font-bold text-xs">
                          AM
                        </div>
                        <div>
                          <p className="text-sm font-medium">AMZN</p>
                          <p className="text-xs text-gray-500">Amazon.com, Inc.</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">$1,860.00</p>
                        <p className="text-xs text-red-600">-2.10%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Investment Philosophy */}
                </div>
              )}
            </div>
            )}

            {/* ── Watching Tab (own profile only) ── */}
            {activeTab === 'watching' && isOwnProfile && <WatchingTab />}

            {/* ── Posts Tab ── */}
            {activeTab === 'posts' && (
              <>
                {posts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <h3 className="text-xl font-bold mb-2">No posts yet</h3>
                    <p className="text-gray-500 text-sm max-w-xs">
                      {creator.name} hasn't shared any posts yet. Check back later.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {posts.map((post) => (
                    <div key={post.id} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm flex-shrink-0">{creator.avatar}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm">{creator.name}</span>
                            {creator.verified && (
                              <svg className="w-4 h-4 text-[#00a86b]" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{creator.handle}</span><span>·</span><span>{post.time}</span>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600 flex-shrink-0">{post.tag}</span>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed mb-3">{post.content}</p>
                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <button className="flex items-center gap-1.5 hover:text-[#00a86b] transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                          {post.likes.toLocaleString()}
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          {post.comments}
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-green-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          {post.reposts.toLocaleString()}
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-gray-700 transition-colors ml-auto">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        </button>
                      </div>
                      <ContentDisclaimer />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── About Tab ── */}
            {activeTab === 'about' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-5">
                  <div className="p-5 bg-white border border-gray-200 rounded-xl">
                    <h2 className="text-base font-semibold mb-3">About {creator.name}</h2>
                    <p className="text-sm text-gray-700 leading-relaxed">{creator.bio}</p>
                  </div>
                  <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl">
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Disclaimer:</strong> Content shared is for educational purposes only and not financial advice. Always do your own research and consult a licensed advisor before making investment decisions.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {(dbProfile?.tags?.length || creator.focus) && (
                    <div className="p-5 bg-white border border-gray-200 rounded-xl">
                      <h3 className="text-base font-semibold mb-3">Focus Areas</h3>
                      <div className="flex flex-wrap gap-2">
                        {(dbProfile?.tags?.length ? dbProfile.tags : [creator.focus]).map(tag => (
                          <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-3">
                    <h3 className="text-base font-semibold">By the numbers</h3>
                    {[
                      { label: 'Followers', value: followerCount !== null ? followerCount.toLocaleString() : creator.followers },
                      { label: 'Posts', value: postCount !== null ? postCount.toLocaleString() : creator.posts },
                      { label: 'Joined', value: dbProfile ? new Date(dbProfile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—' },
                    ].map(stat => (
                      <div key={stat.label} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{stat.label}</span>
                        <span className="font-semibold">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {showSubscribeModal && (
        <SubscriptionModal
          onClose={() => setShowSubscribeModal(false)}
          creatorId={creatorId}
          creatorName={creator.name}
        />
      )}

      {showChat && dbProfile && (
        <CreatorChatWidget
          key={dbProfile.id}
          creatorId={dbProfile.id}
          creatorName={creator.name}
          creatorAvatarUrl={dbProfile.avatar_url}
          onClose={() => setShowChat(false)}
        />
      )}

      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#00a86b] text-white px-6 py-4 rounded-xl shadow-lg z-50 animate-slide-up pointer-events-none">
          <p className="font-bold">{toastMessage}</p>
        </div>
      )}
    </>
  );
}
