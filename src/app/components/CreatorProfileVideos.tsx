import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ShareIcon from '@mui/icons-material/Share';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AppHeader from './AppHeader';
import SubscriptionModal from './SubscriptionModal';
import CreatorChatWidget from './CreatorChatWidget';
import ContentDisclaimer from './compliance/ContentDisclaimer';
import { getCreator, type MockCreator } from '../data/creators';
import { type Video, getVideosByCreator as getMockVideos } from '../data/reels';
import { getCreatorByUsername, getFollowerCount } from '../../lib/services/profiles.service';
import { getVideosByCreator as getDbVideos } from '../../lib/services/reels.service';
import { getPostCountByCreator, getPostsByCreator } from '../../lib/services/posts.service';
import { getCommentCount } from '../../lib/services/comments.service';
import { getFollowingCount } from '../../lib/services/follows.service';
import { reportServiceError } from '../hooks/useServiceQuery';
import type { Profile, VideoWithCreator, PostWithCreator } from '../../types/database';
import { useFollow } from '../contexts/FollowContext';
import { SUBSCRIBE_ENABLED } from '../featureFlags';

// ── Helpers ──────────────────────────────────────────────────────────
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
];

// Fallback content for the small MOCK_CREATORS set (no real posts.service data for them).
const MOCK_POSTS_FALLBACK: DisplayPost[] = [
  { id: 'mock-1', time: '2h ago', content: "Just added to my NVDA position. AI infrastructure spending isn't slowing down — data center capex from the hyperscalers is still accelerating. This is a multi-year theme, not a trade.", likes: 1240, comments: 87, reposts: 203, tag: '📈 Portfolio Update' },
  { id: 'mock-2', time: '1d ago', content: "Reminder: volatility is not risk. Risk is permanent loss of capital. A 20% drawdown in a fundamentally strong company is an opportunity, not a reason to panic sell. Zoom out.", likes: 3421, comments: 142, reposts: 891, tag: '💡 Investing Insight' },
  { id: 'mock-3', time: '3d ago', content: "Fed held rates steady again. My read: we're in a higher-for-longer environment through at least Q3. Positioning accordingly — overweight value, underweight long-duration growth. Cash is still earning 5%+, don't sleep on it.", likes: 2108, comments: 219, reposts: 445, tag: '🏦 Macro Watch' },
  { id: 'mock-4', time: '5d ago', content: "Q1 earnings recap: beat on revenue, missed on margins. Management guided conservatively for Q2 which I think is sandbagging. Holding my position. Full breakdown in my latest video — link in bio.", likes: 987, comments: 63, reposts: 134, tag: '📊 Earnings' },
  { id: 'mock-5', time: '1w ago', content: "New to investing? The single best thing you can do this year: set up automatic contributions to a low-cost index fund and stop watching the daily price. Time in market beats timing the market — every time.", likes: 5832, comments: 314, reposts: 2109, tag: '🎓 Beginner Tips' },
];

interface DisplayPost {
  id: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  reposts: number;
  tag: string;
}

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

function normalizeDbVideo(v: VideoWithCreator, i: number): Video {
  const secs = v.duration_seconds ?? 0;
  const mm = String(Math.floor(secs / 60)).padStart(1, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const views = v.view_count >= 1000
    ? `${(v.view_count / 1000).toFixed(0)}K`
    : String(v.view_count);
  const diff = Date.now() - new Date(v.created_at).getTime();
  const days = Math.floor(diff / 86_400_000);
  const uploaded = days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
  return {
    id: i,
    creator_id: v.creator.username,
    title: v.title,
    thumbnail: v.thumbnail_url ?? FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length],
    duration: `${mm}:${ss}`,
    views,
    uploaded_at: uploaded,
  };
}

// ── Component ─────────────────────────────────────────────────────────
export default function CreatorProfileVideos() {
  const navigate = useNavigate();
  const { creatorId = 'alex-rodriguez' } = useParams<{ creatorId: string }>();
  const mockCreator = getCreator(creatorId);

  // ── Remote data ────────────────────────────────────────────────────
  const [dbProfile, setDbProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const [dbVideos, setDbVideos] = useState<Video[] | null>(null);
  const [dbPosts, setDbPosts] = useState<DisplayPost[] | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);

  // ── UI state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'investment' | 'videos' | 'posts' | 'about'>('videos');
  const [notificationsOn, setNotificationsOn] = useState(() => {
    try { return localStorage.getItem(`gazua:notif:${creatorId}`) === 'true'; } catch { return false; }
  });
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // ── Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    setProfileLoading(true);
    getCreatorByUsername(creatorId).then(({ data, error }) => {
      setDbProfile(data);
      setProfileLoading(false);
      if (error) {
        reportServiceError(error, { label: 'this creator profile', retry: () => setProfileRefreshKey(k => k + 1) });
      }
      if (data) {
        // Videos and follower count load eagerly
        getDbVideos(data.id).then(({ data: vids, error: vidsError }) => {
          if (vidsError) {
            reportServiceError(vidsError, { label: `${data.full_name}'s videos` });
            return;
          }
          if (vids && vids.length > 0) setDbVideos(vids.map(normalizeDbVideo));
        });
        getFollowerCount(data.id).then(({ data: n }) => { if (n !== null) setFollowerCount(n); });
        getFollowingCount(data.id).then(({ data: n }) => { if (n !== null) setFollowingCount(n); });
        getPostCountByCreator(data.id).then(({ data: n }) => { if (n !== null) setPostCount(n); });
        getPostsByCreator(data.id).then(({ data: posts, error: postsError }) => {
          if (postsError) {
            reportServiceError(postsError, { label: `${data.full_name}'s posts` });
            return;
          }
          if (!posts) return;
          Promise.all(posts.map(normalizeDbPost)).then(setDbPosts);
        });
      }
    });
  }, [creatorId, profileRefreshKey]);

  // ── Derived data ───────────────────────────────────────────────────
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

  // DB videos take priority; fall back to mock if DB returned nothing
  const videos = dbVideos ?? getMockVideos(creatorId);
  // Real creators use dbPosts (possibly a genuinely empty [] while it loads or once real
  // posts are confirmed) — only creators outside the DB (dbProfile === null, the small
  // MOCK_CREATORS set) fall back to the static mock list.
  const posts = dbProfile ? (dbPosts ?? []) : MOCK_POSTS_FALLBACK;

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
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    triggerToast('Profile link copied to clipboard');
  };

  // ── Loading skeleton ───────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <AppHeader />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-pulse">
            <div className="h-4 bg-neutral-200 rounded w-16 mb-8" />
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-8">
              <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-neutral-200 flex-shrink-0" />
              <div className="flex-1 space-y-3 pt-2">
                <div className="h-7 bg-neutral-200 rounded w-48" />
                <div className="h-4 bg-neutral-200 rounded w-28" />
                <div className="flex gap-6 mt-2">
                  <div className="h-4 bg-neutral-200 rounded w-20" />
                  <div className="h-4 bg-neutral-200 rounded w-20" />
                  <div className="h-4 bg-neutral-200 rounded w-20" />
                </div>
                <div className="h-4 bg-neutral-200 rounded w-full max-w-lg mt-2" />
                <div className="h-4 bg-neutral-200 rounded w-4/5 max-w-md" />
                <div className="flex gap-3 mt-4">
                  <div className="h-10 bg-neutral-200 rounded-full w-24" />
                  <div className="h-10 bg-neutral-200 rounded-full w-24" />
                  <div className="h-10 bg-neutral-200 rounded-full w-24" />
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
            <p className="text-neutral-600 mb-4">This creator profile doesn't exist yet.</p>
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
    <div className="h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 pt-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-black">
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            Back
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8">

          {/* ── Profile Header ── */}
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-4xl sm:text-5xl flex-shrink-0">
              {creator.avatar}
            </div>

            <div className="flex-1 w-full">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold">{creator.name}</h1>
                    {creator.verified && (
                      <span title="Portfolio allocation verified by Gazua" className="inline-flex">
                        <svg className="w-6 h-6 text-brand" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-600 mb-3">{creator.handle}</p>
                  <div className="flex items-center flex-wrap gap-3 sm:gap-6 text-sm mb-4">
                    <div>
                      <span className="font-bold text-lg">
                        {followerCount !== null ? followerCount.toLocaleString() : creator.followers}
                      </span>
                      <span className="text-neutral-600 ml-1">followers</span>
                    </div>
                    <div>
                      <span className="font-bold text-lg">
                        {followingCount !== null ? followingCount.toLocaleString() : creator.following}
                      </span>
                      <span className="text-neutral-600 ml-1">following</span>
                    </div>
                    <div>
                      <span className="font-bold text-lg">
                        {postCount !== null ? postCount.toLocaleString() : creator.posts}
                      </span>
                      <span className="text-neutral-600 ml-1">posts</span>
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
                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                    title="Toggle notifications"
                  >
                    {notificationsOn
                      ? <NotificationsActiveIcon sx={{ fontSize: 20, color: 'var(--brand)' }} />
                      : <NotificationsIcon sx={{ fontSize: 20 }} />
                    }
                  </button>
                  <button onClick={handleShare} className="p-2 hover:bg-neutral-100 rounded-full transition-colors" title="Share profile">
                    <ShareIcon sx={{ fontSize: 20 }} />
                  </button>
                  <div className="relative">
                    <button onClick={() => setShowMoreMenu(v => !v)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                      <MoreHorizIcon sx={{ fontSize: 20 }} />
                    </button>
                    {showMoreMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg py-2 w-44 z-10" onMouseLeave={() => setShowMoreMenu(false)}>
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-50" onClick={() => { triggerToast('Report submitted'); setShowMoreMenu(false); }}>Report creator</button>
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-50" onClick={() => { triggerToast('Creator muted'); setShowMoreMenu(false); }}>Mute creator</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-6 max-w-2xl">{creator.bio}</p>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={handleFollowToggle}
                  className={`px-6 sm:px-8 py-2.5 font-medium text-sm rounded-full transition-colors ${isFollowingCreator ? 'bg-neutral-200 text-black hover:bg-neutral-300' : 'bg-black text-white hover:bg-black/80'}`}
                >
                  {isFollowingCreator ? 'Following' : 'Follow'}
                </button>
                {SUBSCRIBE_ENABLED && (
                  <button
                    onClick={() => setShowSubscribeModal(true)}
                    className="px-6 sm:px-8 py-2.5 bg-mint text-black font-medium text-sm rounded-full hover:bg-mint-hover transition-colors"
                  >
                    Subscribe
                  </button>
                )}
                {dbProfile && (
                  <button
                    onClick={() => setShowChat(true)}
                    className="px-5 sm:px-6 py-2.5 bg-neutral-100 text-black font-medium text-sm rounded-full hover:bg-neutral-200 transition-colors"
                  >
                    Message
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="border-b border-neutral-200 mb-6 sm:mb-8">
            <div className="flex gap-4 sm:gap-8 overflow-x-auto">
              {(['investment', 'videos', 'posts', 'about'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'investment') navigate(`/profile/${creatorId}/investment`);
                  }}
                  className={`pb-4 px-1 font-medium text-sm border-b-2 capitalize transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab ? 'border-black text-black' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* ── Videos Tab ── */}
          {activeTab === 'videos' && (
            <>
              {videos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                    <VideoLibraryIcon sx={{ fontSize: 40, color: '#d1d5db' }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No videos yet</h3>
                  <p className="text-neutral-500 text-sm max-w-xs">
                    {creator.name} hasn't published any videos yet. Check back later.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {videos.map(video => (
                  <div
                    key={video.id}
                    className="group cursor-pointer"
                    onClick={() => (dbVideos === null ? navigate(`/watch/${video.id}`) : setPreviewVideo(video))}
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
                      <div className="absolute inset-0" style={{ background: video.thumbnail }} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                          <PlayArrowIcon sx={{ fontSize: 32, color: '#000000', marginLeft: '4px' }} />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
                        {video.duration}
                      </div>
                    </div>
                    <h3 className="font-medium text-sm mb-1 group-hover:text-brand transition-colors line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-neutral-600">{video.views} views • {video.uploaded_at}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Posts Tab ── */}
          {activeTab === 'posts' && (
            <>
              {posts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                    <VideoLibraryIcon sx={{ fontSize: 40, color: '#d1d5db' }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No posts yet</h3>
                  <p className="text-neutral-500 text-sm max-w-xs">
                    {creator.name} hasn't shared any posts yet. Check back later.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {posts.map((post) => (
                  <div key={post.id} className="p-4 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 transition-colors flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {creator.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm">{creator.name}</span>
                          {creator.verified && (
                            <svg className="w-3.5 h-3.5 text-brand" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                          <span>{creator.handle}</span><span>·</span><span>{post.time}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-neutral-100 rounded-full text-neutral-500 flex-shrink-0">{post.tag}</span>
                    </div>
                    <p className="text-sm text-neutral-800 leading-relaxed flex-1 mb-3">{post.content}</p>
                    <div className="flex items-center gap-5 text-xs text-neutral-400 pt-3 border-t border-neutral-100 mt-auto">
                      <button className="flex items-center gap-1.5 hover:text-brand transition-colors text-[14px]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        {post.likes.toLocaleString()}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors text-[14px]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        {post.comments}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-brand transition-colors text-[14px]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {post.reposts.toLocaleString()}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-neutral-600 transition-colors ml-auto">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
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
                <div className="p-5 bg-white border border-neutral-200 rounded-xl">
                  <h2 className="text-base font-semibold mb-3">About {creator.name}</h2>
                  <p className="text-sm text-neutral-700 leading-relaxed">{creator.bio}</p>
                </div>
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Disclaimer:</strong> Content shared is for educational purposes only and not financial advice. Always do your own research and consult a licensed advisor before making investment decisions.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {(dbProfile?.tags?.length || creator.focus) && (
                  <div className="p-5 bg-white border border-neutral-200 rounded-xl">
                    <h3 className="text-base font-semibold mb-3">Focus Areas</h3>
                    <div className="flex flex-wrap gap-2">
                      {(dbProfile?.tags?.length ? dbProfile.tags : [creator.focus]).map(tag => (
                        <span key={tag} className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-5 bg-white border border-neutral-200 rounded-xl space-y-3">
                  <h3 className="text-base font-semibold">By the numbers</h3>
                  {[
                    { label: 'Followers', value: followerCount !== null ? followerCount.toLocaleString() : creator.followers },
                    { label: 'Videos published', value: String(videos.length) },
                    { label: 'Joined', value: dbProfile ? new Date(dbProfile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—' },
                  ].map(stat => (
                    <div key={stat.label} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500">{stat.label}</span>
                      <span className="font-semibold">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Video Preview Modal ── */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewVideo(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="relative aspect-video" style={{ background: previewVideo.thumbnail }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <VideoLibraryIcon sx={{ fontSize: 48, color: '#ffffff' }} />
                </div>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <CloseIcon sx={{ fontSize: 20, color: '#ffffff' }} />
              </button>
              <div className="absolute bottom-4 right-4 bg-black/80 text-white text-sm font-medium px-3 py-1 rounded">
                {previewVideo.duration}
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{previewVideo.title}</h3>
              <p className="text-sm text-neutral-600 mb-4">{creator.name} • {previewVideo.views} views • {previewVideo.uploaded_at}</p>
              <div className="p-4 bg-neutral-50 rounded-lg text-center text-sm text-neutral-600">
                🎬 Full video playback coming soon.
              </div>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-brand text-white px-6 py-4 rounded-xl shadow-lg z-50 animate-slide-up pointer-events-none">
          <p className="font-bold">{toastMessage}</p>
        </div>
      )}

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
    </div>
  );
}
