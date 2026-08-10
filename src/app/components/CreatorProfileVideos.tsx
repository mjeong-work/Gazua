import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AppHeader from './AppHeader';
import CreatorProfileHeader from './creatorProfile/CreatorProfileHeader';
import CreatorProfileTabs, { type CreatorProfileTab } from './creatorProfile/CreatorProfileTabs';
import CreatorPostsTab from './creatorProfile/CreatorPostsTab';
import CreatorAboutTab from './creatorProfile/CreatorAboutTab';
import { type Video, getVideosByCreator as getMockVideos } from '../data/reels';
import { getVideosByCreator as getDbVideos } from '../../lib/services/reels.service';
import { reportServiceError } from '../hooks/useServiceQuery';
import { useCreatorProfileData } from '../hooks/useCreatorProfileData';
import type { VideoWithCreator } from '../../types/database';

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
    db_id: v.id,
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

  const { dbProfile, profileLoading, followerCount, followingCount, postCount, posts, creator } =
    useCreatorProfileData(creatorId);

  // ── Video-specific data ───────────────────────────────────────────
  const [dbVideos, setDbVideos] = useState<Video[] | null>(null);

  useEffect(() => {
    if (!dbProfile) return;
    getDbVideos(dbProfile.id).then(({ data: vids, error: vidsError }) => {
      if (vidsError) {
        reportServiceError(vidsError, { label: `${dbProfile.full_name}'s videos` });
        return;
      }
      if (vids && vids.length > 0) setDbVideos(vids.map(normalizeDbVideo));
    });
  }, [dbProfile]);

  const videos = dbVideos ?? getMockVideos(creatorId);

  // ── UI state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<CreatorProfileTab>('videos');
  const handleSelectTab = (tab: CreatorProfileTab) => {
    setActiveTab(tab);
    if (tab === 'investment') navigate(`/profile/${creatorId}/investment`);
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

          <CreatorProfileHeader
            creatorId={creatorId}
            creator={creator}
            dbProfile={dbProfile}
            followerCount={followerCount}
            followingCount={followingCount}
            postCount={postCount}
          />

          <CreatorProfileTabs activeTab={activeTab} onSelectTab={handleSelectTab} />

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
                    onClick={() => navigate(`/watch/${video.db_id ?? video.id}`)}
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
          {activeTab === 'posts' && <CreatorPostsTab creator={creator} posts={posts} />}

          {/* ── About Tab ── */}
          {activeTab === 'about' && (
            <CreatorAboutTab
              creator={creator}
              dbProfile={dbProfile}
              followerCount={followerCount}
              secondaryStat={{ label: 'Videos published', value: String(videos.length) }}
            />
          )}

        </div>
      </div>
    </div>
  );
}
