import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AppHeader from './AppHeader';
import ReelEngagementBar from './reels/ReelEngagementBar';
import ReelMetadata from './reels/ReelMetadata';
import { seedFromId, formatCount, formatDurationSeconds } from './reels/format';
import { CREATOR_VIDEOS, getVideosByCreator as getMockVideosByCreator } from '../data/reels';
import { getCreator } from '../data/creators';
import { isCreatorVerified } from '../utils/creator';
import VerifiedBadge from './VerifiedBadge';
import { getVideoById, getVideosByCreator as getDbVideosByCreator } from '../../lib/services/reels.service';
import { getFollowerCount } from '../../lib/services/follows.service';
import { useFollow, isUUID } from '../contexts/FollowContext';
import type { SavedContentInput } from '../contexts/SavedContentContext';
import { BUCKETS, getPublicUrl } from '../../lib/storage';

type SavedItemMeta = Omit<SavedContentInput, 'userId'>;

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
];

/** Stable numeric seed for seedFromId() — mock video ids are already numbers; real video ids
 * are UUID strings, so hash them down to an int instead (using .length would collide badly,
 * e.g. every single-digit mock id would hash identically). */
function hashToInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

interface MoreVideoItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  uploadedAt: string;
}

interface ResolvedVideo {
  id: string;
  /** Mock video ids used directly; real UUIDs hashed via hashToInt(). Feeds seedFromId(). */
  numericSeed: number;
  title: string;
  thumbnail: string;
  /** Bucket-relative storage path — present for DB-backed videos with a real uploaded file. */
  storagePath?: string;
  duration: string;
  views: string;
  uploadedAt: string;
  /** Username slug for /profile/:slug/videos — same for real and mock creators. */
  creatorRouteSlug: string;
  /** Real UUID for DB creators (so Follow persists to Supabase), else the mock slug. */
  creatorFollowId: string;
  creatorName: string;
  creatorAvatar: string;
  creatorVerified: boolean;
  /** '' when unknown (mock creators without a stored follower stat). */
  creatorFollowers: string;
  moreVideos: MoreVideoItem[];
}

export default function VideoWatchPage() {
  const navigate = useNavigate();
  const { videoId } = useParams<{ videoId: string }>();

  const [resolved, setResolved] = useState<ResolvedVideo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setResolved(null);

    if (!videoId) { setLoading(false); return; }

    getVideoById(videoId).then(async ({ data: dbVideo }) => {
      if (cancelled) return;

      // ── Real video found ──────────────────────────────────────────
      if (dbVideo) {
        const [moreRes, followerRes] = await Promise.all([
          getDbVideosByCreator(dbVideo.creator.id),
          getFollowerCount(dbVideo.creator.id),
        ]);
        if (cancelled) return;

        setResolved({
          id: dbVideo.id,
          numericSeed: hashToInt(dbVideo.id),
          title: dbVideo.title,
          thumbnail: dbVideo.thumbnail_url ?? FALLBACK_GRADIENTS[0],
          storagePath: dbVideo.storage_path ?? undefined,
          duration: formatDurationSeconds(dbVideo.duration_seconds ?? 0),
          views: formatCount(dbVideo.view_count),
          uploadedAt: new Date(dbVideo.created_at).toLocaleDateString(),
          creatorRouteSlug: dbVideo.creator.username,
          creatorFollowId: dbVideo.creator.id,
          creatorName: dbVideo.creator.full_name,
          creatorAvatar: dbVideo.creator.avatar_url ?? '👤',
          creatorVerified: isCreatorVerified(dbVideo.creator),
          creatorFollowers: formatCount(followerRes.data ?? 0),
          moreVideos: (moreRes.data ?? [])
            .filter(v => v.id !== dbVideo.id)
            .map(v => ({
              id: v.id,
              title: v.title,
              thumbnail: v.thumbnail_url ?? FALLBACK_GRADIENTS[1],
              duration: formatDurationSeconds(v.duration_seconds ?? 0),
              views: formatCount(v.view_count),
              uploadedAt: new Date(v.created_at).toLocaleDateString(),
            })),
        });
        setLoading(false);
        return;
      }

      // ── Fallback: legacy mock catalog, looked up by numeric id ──────
      const mockVideo = CREATOR_VIDEOS.find(v => v.id === Number(videoId));
      const mockCreator = mockVideo ? getCreator(mockVideo.creator_id) : null;
      if (!mockVideo || !mockCreator) { setResolved(null); setLoading(false); return; }

      setResolved({
        id: String(mockVideo.id),
        numericSeed: mockVideo.id,
        title: mockVideo.title,
        thumbnail: mockVideo.thumbnail,
        duration: mockVideo.duration,
        views: mockVideo.views,
        uploadedAt: mockVideo.uploaded_at,
        creatorRouteSlug: mockVideo.creator_id,
        creatorFollowId: mockVideo.creator_id,
        creatorName: mockCreator.name,
        creatorAvatar: mockCreator.avatar,
        creatorVerified: mockCreator.verified,
        creatorFollowers: mockCreator.followers,
        moreVideos: getMockVideosByCreator(mockVideo.creator_id)
          .filter(v => v.id !== mockVideo.id)
          .map(v => ({
            id: String(v.id),
            title: v.title,
            thumbnail: v.thumbnail,
            duration: v.duration,
            views: v.views,
            uploadedAt: v.uploaded_at,
          })),
      });
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [videoId]);

  const { isFollowing: isFollowingFn, toggleFollow } = useFollow();
  const isFollowingCreator = resolved ? isFollowingFn(resolved.creatorFollowId) : false;

  // Mock like state — no video_likes table exists yet, matches the previous behavior.
  const [isLiked, setIsLiked] = useState(false);
  const likeCount = seedFromId(resolved ? resolved.numericSeed : 0, 800, 4000) + (isLiked ? 1 : 0);

  const savedItem: SavedItemMeta | null = resolved ? {
    contentId: `video:${resolved.id}`,
    contentType: 'video',
    surface: 'video',
    rawId: resolved.id,
    title: resolved.title,
    thumbnail: resolved.thumbnail,
    creatorName: resolved.creatorName,
    creatorId: resolved.creatorRouteSlug,
    meta: resolved.views ? `${resolved.views} views` : undefined,
  } : null;

  const [commentsPortalEl, setCommentsPortalEl] = useState<HTMLDivElement | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Video not found</h2>
            <p className="text-neutral-600 mb-4">This video doesn't exist or may have been removed.</p>
            <button onClick={() => navigate('/creators')} className="px-6 py-3 bg-black text-white rounded-sm hover:bg-black/80">
              Browse Creators
            </button>
          </div>
        </div>
      </div>
    );
  }

  const video = resolved;

  return (
    <div className="h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className={`mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-8 transition-[max-width] duration-200 ${isCommentsOpen ? 'max-w-6xl' : 'max-w-4xl'} lg:flex lg:items-start lg:gap-6`}>
        <div className="min-w-0 flex-1">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-black mb-4">
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            Back
          </button>

          {/* ── Player ── */}
          <div className="relative aspect-video rounded-md overflow-hidden mb-4 bg-black">
            {video.storagePath ? (
              <video
                controls
                playsInline
                poster={video.thumbnail.startsWith('http') ? video.thumbnail : undefined}
                className="w-full h-full object-contain bg-black"
                src={getPublicUrl(BUCKETS.videos, video.storagePath)}
              />
            ) : (
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    background: video.thumbnail.startsWith('http') ? `url(${video.thumbnail})` : video.thumbnail,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <PlayArrowIcon sx={{ fontSize: 40, color: '#ffffff' }} />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded">
                  Preview only
                </div>
                <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded">
                  {video.duration}
                </div>
              </>
            )}
          </div>

          {/* ── Title & stats ── */}
          <h1 className="text-xl font-bold mb-1">{video.title}</h1>
          <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-neutral-500 mb-4">
            <ReelMetadata viewCount={video.views} likeCount={likeCount} />
            <span aria-hidden="true">·</span>
            <span>{video.uploadedAt}</span>
          </div>

          {/* ── Creator bar ── */}
          <div className="flex items-center justify-between border-t border-neutral-200 pt-4 mb-4">
            <button
              onClick={() => navigate(`/profile/${video.creatorRouteSlug}/videos`)}
              className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
            >
              <div className="w-11 h-11 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xl flex-shrink-0">
                {video.creatorAvatar}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">{video.creatorName}</span>
                  {video.creatorVerified && <VerifiedBadge />}
                </div>
                {video.creatorFollowers && <p className="text-xs text-neutral-500">{video.creatorFollowers} followers</p>}
              </div>
            </button>

            <button
              onClick={() => toggleFollow(video.creatorFollowId)}
              className={`px-5 py-2 rounded-sm text-sm font-medium transition-colors ${
                isFollowingCreator ? 'bg-neutral-200 text-black hover:bg-neutral-300' : 'bg-black text-white hover:bg-black/80'
              }`}
            >
              {isFollowingCreator ? 'Following' : 'Follow'}
            </button>
          </div>

          {/* ── Engagement bar ── */}
          <ReelEngagementBar
            contentId={video.id}
            isLiked={isLiked}
            likeCount={likeCount}
            onToggleLike={() => setIsLiked(v => !v)}
            commentSeed={seedFromId(video.numericSeed, 20, 200)}
            commentsContentType="video"
            commentsContentDbId={isUUID(video.id) ? video.id : null}
            shareUrl={window.location.href}
            shareTitle={video.title}
            onToast={(msg, subtitle) => toast(msg, subtitle ? { description: subtitle } : undefined)}
            className="border-y border-neutral-200 py-4 mb-8"
            commentsPortalTarget={commentsPortalEl}
            onCommentPanelOpenChange={setIsCommentsOpen}
            savedItem={savedItem!}
          />

          {/* ── More from this creator ── */}
          {video.moreVideos.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-4">More from {video.creatorName}</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {video.moreVideos.map(v => (
                  <div key={v.id} onClick={() => navigate(`/watch/${v.id}`)} className="flex-shrink-0 w-64 group cursor-pointer">
                    <div className="relative aspect-video rounded-md overflow-hidden mb-2">
                      <div className="absolute inset-0" style={{ background: v.thumbnail }} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                          <PlayArrowIcon sx={{ fontSize: 24, color: '#000000', marginLeft: '3px' }} />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                        {v.duration}
                      </div>
                    </div>
                    <h3 className="font-medium text-sm mb-1 line-clamp-2 group-hover:text-brand transition-colors">{v.title}</h3>
                    <p className="text-xs text-neutral-400">{v.views} views · {v.uploadedAt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop adjacent comments panel slot — a real flex sibling of the main content
            column (not an overlay), so the video is never covered or resized underneath it.
            Collapses to zero width when comments are closed. */}
        <div
          ref={setCommentsPortalEl}
          className={isCommentsOpen ? 'hidden lg:flex lg:w-[360px] lg:flex-shrink-0 lg:h-[600px] lg:sticky lg:top-6' : 'hidden'}
        />
        </div>
      </div>
    </div>
  );
}
