import { useEffect, useState } from 'react';
import { getVideosByCreator } from '../../lib/services/reels.service';
import { formatDurationSeconds, formatCount } from '../components/reels/format';
import { useServiceQuery } from './useServiceQuery';

const VIDEO_FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
];

export interface VideoListItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  uploadedAt: string;
  storagePath: string | null;
}

// Shared by MyProfilePage (needs videos.length for the header/About stats) and VideosTab (needs
// the list itself plus local mutation for inline title-edit/delete) — lives in the parent so
// both get the same fetch instead of duplicating it.
export function useMyProfileVideos(profileId: string | undefined) {
  const [videos, setVideos] = useState<VideoListItem[]>([]);

  const { data: videoRows, refetch: refreshVideos } = useServiceQuery(
    () => getVideosByCreator(profileId!),
    [profileId],
    { enabled: !!profileId, label: 'videos' },
  );

  useEffect(() => {
    if (!videoRows) return;
    setVideos(videoRows.map((v, i) => ({
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnail_url ?? VIDEO_FALLBACK_GRADIENTS[i % VIDEO_FALLBACK_GRADIENTS.length],
      duration: formatDurationSeconds(v.duration_seconds ?? 0),
      views: formatCount(v.view_count),
      uploadedAt: new Date(v.created_at).toLocaleDateString(),
      storagePath: v.storage_path ?? null,
    })));
  }, [videoRows]);

  return { videos, setVideos, refreshVideos };
}
