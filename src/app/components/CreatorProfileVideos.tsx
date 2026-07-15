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
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import AppHeader from './AppHeader';
import SubscriptionModal from './SubscriptionModal';
import { getCreator, type MockCreator } from '../data/creators';
import { type Video, getVideosByCreator as getMockVideos } from '../data/reels';
import { getCreatorByUsername, getFollowerCount } from '../../lib/services/profiles.service';
import { getVideosByCreator as getDbVideos } from '../../lib/services/reels.service';
import { getPostsByCreator, getPostCountByCreator } from '../../lib/services/posts.service';
import { getFollowingCount } from '../../lib/services/follows.service';
import type { Profile, VideoWithCreator, PostWithCreator } from '../../types/database';
import { useFollow } from '../contexts/FollowContext';

// ── Helpers ──────────────────────────────────────────────────────────
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
];

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

function sentimentStyle(s: string | null) {
  if (s === 'Bullish') return 'bg-green-100 text-green-700';
  if (s === 'Bearish') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────
export default function CreatorProfileVideos() {
  const navigate = useNavigate();
  const { creatorId = 'alex-rodriguez' } = useParams<{ creatorId: string }>();
  const mockCreator = getCreator(creatorId);

  // ── Remote data ────────────────────────────────────────────────────
  const [dbProfile, setDbProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [dbVideos, setDbVideos] = useState<Video[] | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);

  // Posts are loaded lazily when the Posts tab is first opened
  const [creatorPosts, setCreatorPosts] = useState<PostWithCreator[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsFetched, setPostsFetched] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'investment' | 'videos' | 'posts' | 'about'>('videos');
  const [notificationsOn, setNotificationsOn] = useState(() => {
    try { return localStorage.getItem(`gazua:notif:${creatorId}`) === 'true'; } catch { return false; }
  });
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // ── Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    setProfileLoading(true);
    getCreatorByUsername(creatorId).then(({ data }) => {
      setDbProfile(data);
      setProfileLoading(false);
      if (data) {
        // Videos and follower count load eagerly
        getDbVideos(data.id).then(({ data: vids }) => {
          if (vids && vids.length > 0) setDbVideos(vids.map(normalizeDbVideo));
        });
        getFollowerCount(data.id).then(({ data: n }) => { if (n !== null) setFollowerCount(n); });
        getFollowingCount(data.id).then(({ data: n }) => { if (n !== null) setFollowingCount(n); });
        getPostCountByCreator(data.id).then(({ data: n }) => { if (n !== null) setPostCount(n); });
      }
    });
  }, [creatorId]);

  // Posts: load lazily on first visit to the Posts tab
  useEffect(() => {
    if (activeTab !== 'posts' || !dbProfile || postsFetched) return;
    setPostsLoading(true);
    getPostsByCreator(dbProfile.id).then(({ data }) => {
      setCreatorPosts(data ?? []);
      setPostsLoading(false);
      setPostsFetched(true);
    });
  }, [activeTab, dbProfile, postsFetched]);

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
                <button
                  onClick={() => setShowSubscribeModal(true)}
                  className="px-6 sm:px-8 py-2.5 bg-[#7CFFB2] text-black font-medium text-sm rounded-full hover:bg-[#6EEEA8] transition-colors"
                >
                  Subscribe
                </button>
                <button
                  onClick={() => triggerToast('💬 Messaging coming soon')}
                  className="px-5 sm:px-6 py-2.5 bg-gray-100 text-black font-medium text-sm rounded-full hover:bg-gray-200 transition-colors"
                >
                  Message
                </button>
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
                    if (tab === 'investment') navigate(`/profile/${creatorId}/investment`);
                  }}
                  className={`pb-4 px-1 font-medium text-sm border-b-2 capitalize transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
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
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <VideoLibraryIcon sx={{ fontSize: 40, color: '#d1d5db' }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No videos yet</h3>
                  <p className="text-gray-500 text-sm max-w-xs">
                    {creator.name} hasn't published any videos yet. Check back later.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {videos.map(video => (
                  <div key={video.id} className="group cursor-pointer" onClick={() => setPreviewVideo(video)}>
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
                      <div className="absolute inset-0" style={{ background: video.thumbnail }} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                          <PlayArrowIcon sx={{ fontSize: 32, color: '#000000', marginLeft: '4px' }} />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
                        {video.duration}
                      </div>
                    </div>
                    <h3 className="font-medium text-sm mb-1 group-hover:text-[#00a86b] transition-colors line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-gray-600">{video.views} views • {video.uploaded_at}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Posts Tab ── */}
          {activeTab === 'posts' && (
            postsLoading ? (
              <div className="space-y-4 max-w-2xl">
                {[1, 2, 3].map(n => (
                  <div key={n} className="border border-gray-200 rounded-xl p-5 animate-pulse">
                    <div className="flex justify-between mb-3">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="h-4 bg-gray-200 rounded w-20" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-5/6" />
                      <div className="h-3 bg-gray-200 rounded w-4/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : creatorPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">No Posts Yet</h3>
                <p className="text-gray-600 max-w-sm">This creator hasn't shared any posts yet. Check back later for updates and insights.</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-2xl">
                {creatorPosts.map(post => (
                  <div key={post.id} className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">${post.asset}</span>
                        <span className="text-xs text-gray-400">{post.category}</span>
                        {post.sentiment && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${sentimentStyle(post.sentiment)}`}>
                            {post.sentiment}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatDate(post.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed mb-3">{post.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {post.tags?.map(tag => (
                          <span key={tag} className="text-xs text-[#00a86b] bg-green-50 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0 ml-2">
                        <span className="flex items-center gap-1">
                          <FavoriteBorderIcon sx={{ fontSize: 12 }} />{post.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShareIcon sx={{ fontSize: 12 }} />{post.share_count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── About Tab ── */}
          {activeTab === 'about' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-3">About {creator.name}</h2>
                <p className="text-gray-700 leading-relaxed">{creator.bio}</p>
              </div>
              {creator.focus && (
                <div>
                  <h3 className="font-bold mb-2">Focus Area</h3>
                  <p className="text-gray-700">{creator.focus}</p>
                </div>
              )}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Disclaimer:</strong> Content shared is for educational purposes only and not financial advice. Always do your own research.
                </p>
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
              <p className="text-sm text-gray-600 mb-4">{creator.name} • {previewVideo.views} views • {previewVideo.uploaded_at}</p>
              <div className="p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-600">
                🎬 Full video playback coming soon.
              </div>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#00a86b] text-white px-6 py-4 rounded-xl shadow-lg z-50 animate-slide-up pointer-events-none">
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
    </div>
  );
}
