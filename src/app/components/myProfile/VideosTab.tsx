import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BarChartIcon from '@mui/icons-material/BarChart';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'sonner';
import UploadVideoModal from '../UploadVideoModal';
import type { VideoListItem } from '../../hooks/useMyProfileVideos';

const ANALYTICS_DATA = [
  { day: 'Mon', views: 3200 }, { day: 'Tue', views: 4100 }, { day: 'Wed', views: 2900 },
  { day: 'Thu', views: 5800 }, { day: 'Fri', views: 4700 }, { day: 'Sat', views: 6200 }, { day: 'Sun', views: 5100 },
];

interface VideosTabProps {
  videos: VideoListItem[];
  setVideos: React.Dispatch<React.SetStateAction<VideoListItem[]>>;
  refreshVideos: () => void;
}

export default function VideosTab({ videos, setVideos, refreshVideos }: VideosTabProps) {
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingVideoTitle, setEditingVideoTitle] = useState('');
  const [analyticsVideoId, setAnalyticsVideoId] = useState<string | null>(null);
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleStartEditVideo = (video: VideoListItem) => {
    setEditingVideoId(video.id);
    setEditingVideoTitle(video.title);
    setAnalyticsVideoId(null);
    setDeleteVideoId(null);
  };

  const handleSaveVideoTitle = (id: string) => {
    if (editingVideoTitle.trim()) {
      setVideos(prev => prev.map(v => v.id === id ? { ...v, title: editingVideoTitle.trim() } : v));
    }
    setEditingVideoId(null);
  };

  const handleToggleAnalytics = (id: string) => {
    setAnalyticsVideoId(prev => prev === id ? null : id);
    setEditingVideoId(null);
    setDeleteVideoId(null);
  };

  const handleConfirmDeleteVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
    setDeleteVideoId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold">Your Videos <span className="text-neutral-400 font-normal text-sm ml-1">({videos.length})</span></h2>
        <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors">
          <AddIcon sx={{ fontSize: 16 }} />
          Upload Video
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {videos.map((video) => (
          <div key={video.id} className="group">
            {/* Delete confirmation overlay */}
            {deleteVideoId === video.id ? (
              <div className="aspect-video rounded-xl bg-red-50 border border-red-200 flex flex-col items-center justify-center gap-3 mb-2.5 p-4">
                <p className="text-sm font-medium text-red-700 text-center">Delete "{video.title}"?</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleConfirmDeleteVideo(video.id)} className="px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded-full hover:bg-red-700 transition-colors">Delete</button>
                  <button onClick={() => setDeleteVideoId(null)} className="px-4 py-1.5 border border-neutral-300 text-xs font-medium rounded-full hover:bg-neutral-50 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="relative aspect-video rounded-xl overflow-hidden mb-2.5">
                <div className="absolute inset-0" style={{ background: video.thumbnail }} />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={() => handleStartEditVideo(video)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors" title="Edit title">
                    <EditIcon sx={{ fontSize: 18, color: 'white' }} />
                  </button>
                  <button onClick={() => handleToggleAnalytics(video.id)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors" title="Analytics">
                    <BarChartIcon sx={{ fontSize: 18, color: 'white' }} />
                  </button>
                  <button onClick={() => { setDeleteVideoId(video.id); setEditingVideoId(null); setAnalyticsVideoId(null); }} className="p-2 bg-white/20 hover:bg-red-500/80 rounded-full transition-colors" title="Delete">
                    <DeleteOutlineIcon sx={{ fontSize: 18, color: 'white' }} />
                  </button>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs font-medium px-1.5 py-0.5 rounded">{video.duration}</div>
              </div>
            )}

            {/* Inline title edit */}
            {editingVideoId === video.id ? (
              <div className="flex items-center gap-1.5 mb-1">
                <input
                  autoFocus
                  value={editingVideoTitle}
                  onChange={e => setEditingVideoTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveVideoTitle(video.id); if (e.key === 'Escape') setEditingVideoId(null); }}
                  className="flex-1 text-sm border border-neutral-300 rounded px-2 py-1 focus:outline-none focus:border-black"
                />
                <button onClick={() => handleSaveVideoTitle(video.id)} className="p-1 text-brand hover:bg-green-50 rounded transition-colors"><CheckIcon sx={{ fontSize: 16 }} /></button>
                <button onClick={() => setEditingVideoId(null)} className="p-1 text-neutral-400 hover:bg-neutral-100 rounded transition-colors"><CloseIcon sx={{ fontSize: 16 }} /></button>
              </div>
            ) : (
              <h3 className="font-medium text-sm mb-1 line-clamp-2 leading-snug">{video.title}</h3>
            )}
            <p className="text-xs text-neutral-400">{video.views} views · {video.uploadedAt}</p>

            {/* Analytics panel */}
            {analyticsVideoId === video.id && (
              <div className="mt-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <p className="text-xs font-semibold mb-2 text-neutral-700">7-day views</p>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ANALYTICS_DATA} barSize={12} key={`analytics-bar-${video.id}`}>
                      <XAxis dataKey="day" hide key={`analytics-xaxis-${video.id}`} />
                      <YAxis hide key={`analytics-yaxis-${video.id}`} />
                      <Bar dataKey="views" fill="var(--brand)" radius={[3, 3, 0, 0]} key={`bar-${video.id}`} />
                      <Tooltip contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
                  <span>Avg watch time: <strong className="text-black">7:42</strong></span>
                  <span>CTR: <strong className="text-black">4.2%</strong></span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showUploadModal && (
        <UploadVideoModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={(msg) => { setShowUploadModal(false); refreshVideos(); toast.success(msg); }}
        />
      )}
    </div>
  );
}
