import { useState, useMemo, useRef, useEffect, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { getVideosByCreator, createVideo } from '../../lib/services/reels.service';
import { updateProfile } from '../../lib/services/profiles.service';
import { formatDurationSeconds, formatCount } from './reels/format';
import { BUCKETS, buildOwnerPath, uploadToBucket } from '../../lib/storage';
import { validateVideoFile, loadVideoMetadata, captureThumbnail, LONGFORM_LIMITS } from '../../lib/videoMedia';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import BarChartIcon from '@mui/icons-material/BarChart';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Tooltip } from 'recharts';
import { CHART_TOOLTIP_STYLE, chartCurrencyFormatter, hideChartLabel } from '../utils/chartTooltip';
import { ACTUAL_PORTFOLIO_ENABLED } from '../featureFlags';
import AppHeader from './AppHeader';
import WatchingTab from './WatchingTab';
import { useSavedContent, type SavedContentItem } from '../contexts/SavedContentContext';

type Tab = 'investment' | 'videos' | 'posts' | 'saved' | 'watching' | 'about' | 'analytics';

const TAGS = ['📈 Portfolio Update', '💡 Investing Insight', '🏦 Macro Watch', '📊 Earnings', '🎓 Beginner Tips'];

const INIT_POSTS = [
  { id: 1, time: '2h ago', content: "Just added to my NVDA position. AI infrastructure spending isn't slowing down — data center capex from the hyperscalers is still accelerating. This is a multi-year theme, not a trade.", likes: 1240, comments: 87, reposts: 203, tag: '📈 Portfolio Update', draft: false },
  { id: 2, time: '1d ago', content: "Reminder: volatility is not risk. Risk is permanent loss of capital. A 20% drawdown in a fundamentally strong company is an opportunity, not a reason to panic sell. Zoom out.", likes: 3421, comments: 142, reposts: 891, tag: '💡 Investing Insight', draft: false },
  { id: 3, time: 'Draft', content: "Fed held rates steady again. My read: we're in a higher-for-longer environment through at least Q3. Positioning accordingly — overweight value, underweight long-duration growth.", likes: 0, comments: 0, reposts: 0, tag: '🏦 Macro Watch', draft: true },
  { id: 4, time: '5d ago', content: "Q1 earnings recap: beat on revenue, missed on margins. Management guided conservatively for Q2 which I think is sandbagging. Holding my position. Full breakdown in my latest video.", likes: 987, comments: 63, reposts: 134, tag: '📊 Earnings', draft: false },
  { id: 5, time: 'Draft', content: "New to investing? The single best thing you can do this year: set up automatic contributions to a low-cost index fund and stop watching the daily price.", likes: 0, comments: 0, reposts: 0, tag: '🎓 Beginner Tips', draft: true },
];

const VIDEO_FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
];

interface VideoListItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  uploadedAt: string;
}

const INIT_EXPERIENCE = [
  { role: 'Portfolio Manager', org: 'Major Investment Firm', years: '2012 – 2020' },
  { role: 'Independent Educator', org: 'Gazua Platform', years: '2020 – Present' },
  { role: 'Certified Financial Planner', org: 'CFP Board', years: 'Certified 2011' },
];

interface SimHolding { symbol: string; amount: number; }
interface Simulation {
  id: number;
  name: string;
  startDate: string;
  endDate?: string;
  capital: number;
  holdings: SimHolding[];
  rationale?: string;
  hypothesisPercent: number | null;
  actualPercent: number | null;
}

const INIT_SIMULATIONS: Simulation[] = [
  {
    id: 1,
    name: 'AI Chip Growth Thesis',
    startDate: 'Jan 1, 2026',
    endDate: 'Jun 1, 2026',
    capital: 50000,
    holdings: [{ symbol: 'NVDA', amount: 30000 }, { symbol: 'TSLA', amount: 15000 }],
    rationale: 'Testing AI chip sector growth thesis through NVDA exposure, with EV market diversification via TSLA and a conservative cash buffer for volatility management.',
    hypothesisPercent: 15.0,
    actualPercent: 8.5,
  },
];

const ALLOCATION_DATA = [
  { name: 'Stocks', value: 45, color: 'var(--brand)' },
  { name: 'ETFs', value: 30, color: 'var(--mint)' },
  { name: 'Crypto', value: 15, color: '#f43f5e' },
  { name: 'Cash', value: 10, color: '#e5e7eb' },
];

const ANALYTICS_DATA = [
  { day: 'Mon', views: 3200 }, { day: 'Tue', views: 4100 }, { day: 'Wed', views: 2900 },
  { day: 'Thu', views: 5800 }, { day: 'Fri', views: 4700 }, { day: 'Sat', views: 6200 }, { day: 'Sun', views: 5100 },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Local (not UTC) YYYY-MM-DD, suitable for a date input's min attribute.
function getTodayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Defined at module scope (not inside the component) so it keeps a stable identity across
// re-renders — otherwise React treats every render's Overlay as a new component type and
// remounts its subtree, which was killing focus in modal inputs after every keystroke.
function Overlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export default function MyProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { savedItems, removeSavedContent } = useSavedContent();
  const { profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();

  // Core UI state — ?tab=watching lands here directly (e.g. from the /watchlist redirect).
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return t === 'watching' ? 'watching' : 'investment';
  });
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  const [simulatorMode, setSimulatorMode] = useState(true);
  const [simulationExpanded, setSimulationExpanded] = useState(false);
  const [showSimulationList, setShowSimulationList] = useState(false);

  // My simulations (create/select) state
  const [simulations, setSimulations] = useState<Simulation[]>(INIT_SIMULATIONS);
  const [selectedSimulationId, setSelectedSimulationId] = useState(INIT_SIMULATIONS[0].id);
  const [showNewSimulationForm, setShowNewSimulationForm] = useState(false);
  const [newSimName, setNewSimName] = useState('');
  const [newSimStartDate, setNewSimStartDate] = useState('');
  const [newSimCapital, setNewSimCapital] = useState('');
  const [newSimHoldings, setNewSimHoldings] = useState([{ symbol: '', amount: '' }]);
  const [newSimRationale, setNewSimRationale] = useState('');

  // Profile state — identity (name/handle/avatar) comes from the real authenticated
  // profile, not local mock state; avatarImageUrl is a local-only preview override
  // until avatar upload is wired to real Storage (see MyProfilePage's video-upload
  // pattern for the model to follow when that's done).
  const displayName = profile?.full_name || '';
  const displayHandle = profile?.handle ? `@${profile.handle}` : profile?.username ? `@${profile.username}` : '';
  const avatarGradient = 'from-blue-500 to-purple-600';
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);
  const displayAvatarUrl = avatarImageUrl ?? profile?.avatar_url ?? null;
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState(displayName);
  const [editHandle, setEditHandle] = useState(displayHandle);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // About state
  const [bio, setBio] = useState('Investment educator helping everyday people build wealth through smart investing. 15+ years experience in portfolio management. Sharing real strategies, not get-rich-quick schemes.');
  const [editBio, setEditBio] = useState(bio);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [experience, setExperience] = useState(INIT_EXPERIENCE);
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [editExperience, setEditExperience] = useState(INIT_EXPERIENCE);
  const [focusAreas, setFocusAreas] = useState(['Long-term Value', 'Growth Stocks', 'ETFs', 'Crypto', 'Beginner Education', 'Portfolio Strategy']);
  const [isEditingFocusAreas, setIsEditingFocusAreas] = useState(false);
  const [newFocusArea, setNewFocusArea] = useState('');

  // Video state
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingVideoTitle, setEditingVideoTitle] = useState('');
  const [analyticsVideoId, setAnalyticsVideoId] = useState<string | null>(null);
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDuration, setUploadDuration] = useState<number | null>(null);
  const [uploadThumbnailBlob, setUploadThumbnailBlob] = useState<Blob | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingUpload, setProcessingUpload] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile?.id) return;
    getVideosByCreator(profile.id).then(({ data }) => {
      if (!data) return;
      setVideos(data.map((v, i) => ({
        id: v.id,
        title: v.title,
        thumbnail: v.thumbnail_url ?? VIDEO_FALLBACK_GRADIENTS[i % VIDEO_FALLBACK_GRADIENTS.length],
        duration: formatDurationSeconds(v.duration_seconds ?? 0),
        views: formatCount(v.view_count),
        uploadedAt: new Date(v.created_at).toLocaleDateString(),
      })));
    });
  }, [profile?.id]);

  // Post state
  const [posts, setPosts] = useState(INIT_POSTS);
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [composerContent, setComposerContent] = useState('');
  const [composerTag, setComposerTag] = useState('📈 Portfolio Update');
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [deletePostId, setDeletePostId] = useState<number | null>(null);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const portfolioData = useMemo(() => {
    const points = { '1W': 7, '1M': 30, '3M': 90, '1Y': 252, 'ALL': 400 }[timeRange];
    const base = { '1W': 86000, '1M': 82000, '3M': 76000, '1Y': 62000, 'ALL': 45000 }[timeRange];
    let val = base;
    return Array.from({ length: points }, (_, i) => {
      val = val + (Math.random() - 0.45) * 800 + 30;
      return { time: `t${i}`, value: Math.max(val, base * 0.85) };
    });
  }, [timeRange]);

  const selectedSimulation = simulations.find(s => s.id === selectedSimulationId) ?? simulations[0];
  const selectedSimCash = Math.max(selectedSimulation.capital - selectedSimulation.holdings.reduce((sum, h) => sum + h.amount, 0), 0);
  const hasSimPerformance = selectedSimulation.hypothesisPercent !== null && selectedSimulation.actualPercent !== null;
  const simHypothesisValue = hasSimPerformance ? selectedSimulation.capital * (1 + selectedSimulation.hypothesisPercent! / 100) : 0;
  const simActualValue = hasSimPerformance ? selectedSimulation.capital * (1 + selectedSimulation.actualPercent! / 100) : 0;
  const simDiffPercent = hasSimPerformance ? selectedSimulation.actualPercent! - selectedSimulation.hypothesisPercent! : 0;
  const simDiffValue = simActualValue - simHypothesisValue;

  // ── Handlers ──

  const handleAddHoldingRow = () => setNewSimHoldings(prev => [...prev, { symbol: '', amount: '' }]);
  const handleRemoveHoldingRow = (index: number) => setNewSimHoldings(prev => prev.filter((_, i) => i !== index));
  const handleHoldingChange = (index: number, field: 'symbol' | 'amount', value: string) => {
    setNewSimHoldings(prev => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  };

  const resetNewSimForm = () => {
    setNewSimName('');
    setNewSimStartDate('');
    setNewSimCapital('');
    setNewSimHoldings([{ symbol: '', amount: '' }]);
    setNewSimRationale('');
  };

  const handleCloseNewSimForm = () => {
    setShowNewSimulationForm(false);
    resetNewSimForm();
  };

  const handleCreateSimulation = () => {
    const capitalNum = parseFloat(newSimCapital);
    if (!newSimName.trim() || !capitalNum || capitalNum <= 0) return;
    if (newSimStartDate && newSimStartDate < getTodayISODate()) return;

    const holdings = newSimHoldings
      .filter(h => h.symbol.trim() && parseFloat(h.amount) > 0)
      .map(h => ({ symbol: h.symbol.trim().toUpperCase(), amount: parseFloat(h.amount) }));

    const newSim: Simulation = {
      id: Date.now(),
      name: newSimName.trim(),
      startDate: newSimStartDate
        ? new Date(newSimStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Not set',
      capital: capitalNum,
      holdings,
      rationale: newSimRationale.trim() || undefined,
      hypothesisPercent: null,
      actualPercent: null,
    };

    setSimulations(prev => [newSim, ...prev]);
    setSelectedSimulationId(newSim.id);
    setSimulationExpanded(true);
    handleCloseNewSimForm();
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.origin + '/profile/investment');
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setSavingProfile(true);
    setProfileSaveError(null);

    const { error } = await updateProfile(profile.id, {
      full_name: editName.trim(),
      handle: editHandle.trim().replace(/^@/, '') || null,
    });

    setSavingProfile(false);

    if (error) {
      setProfileSaveError(error);
      return;
    }

    await refreshProfile();
    setShowEditProfile(false);
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarImageUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  // Video handlers
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

  const handleUploadVideo = async () => {
    if (!uploadTitle.trim() || !uploadFile || !profile?.id) return;
    setProcessingUpload(true);
    setUploadError(null);

    const ext = uploadFile.name.split('.').pop() || 'mp4';
    const videoUpload = await uploadToBucket(BUCKETS.videos, buildOwnerPath(profile.id, ext), uploadFile);
    if (videoUpload.error || !videoUpload.data) {
      setUploadError(videoUpload.error ?? 'Failed to upload video. Please try again.');
      setProcessingUpload(false);
      return;
    }

    let thumbnailUrl: string | null = null;
    if (uploadThumbnailBlob) {
      const thumbUpload = await uploadToBucket(BUCKETS.thumbnails, buildOwnerPath(profile.id, 'jpg'), uploadThumbnailBlob);
      if (thumbUpload.data) thumbnailUrl = thumbUpload.data.publicUrl;
    }

    const { data: newVideo, error } = await createVideo({
      creator_id: profile.id,
      title: uploadTitle.trim(),
      storage_path: videoUpload.data.path,
      thumbnail_url: thumbnailUrl,
      duration_seconds: uploadDuration ? Math.round(uploadDuration) : null,
    });

    setProcessingUpload(false);

    if (error || !newVideo) {
      setUploadError(error ?? 'Failed to publish. Please try again.');
      return;
    }

    setVideos(prev => [{
      id: newVideo.id,
      title: newVideo.title,
      thumbnail: newVideo.thumbnail_url ?? VIDEO_FALLBACK_GRADIENTS[0],
      duration: formatDurationSeconds(newVideo.duration_seconds ?? 0),
      views: '0',
      uploadedAt: 'Just now',
    }, ...prev]);
    handleCloseUploadModal();
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadTitle('');
    setUploadFileName(null);
    setUploadFile(null);
    setUploadDuration(null);
    setUploadThumbnailBlob(null);
    setUploadError(null);
  };

  const handleVideoFileSelected = async (file: File | null | undefined) => {
    if (!file) return;

    const validationError = validateVideoFile(file, LONGFORM_LIMITS);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadFileName(file.name);
    if (!uploadTitle.trim()) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    setProcessingUpload(true);
    setUploadError(null);
    try {
      const { duration, objectUrl } = await loadVideoMetadata(file);
      const thumbBlob = await captureThumbnail(objectUrl);
      URL.revokeObjectURL(objectUrl);
      setUploadFile(file);
      setUploadDuration(duration);
      setUploadThumbnailBlob(thumbBlob);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not process this video.');
    } finally {
      setProcessingUpload(false);
    }
  };

  // Post handlers
  const handleOpenComposer = () => {
    setComposerContent('');
    setComposerTag('📈 Portfolio Update');
    setEditingPostId(null);
    setShowPostComposer(true);
  };

  const handleOpenEditPost = (post: typeof INIT_POSTS[0]) => {
    setComposerContent(post.content);
    setComposerTag(post.tag);
    setEditingPostId(post.id);
    setShowPostComposer(true);
  };

  const handleSavePost = () => {
    if (!composerContent.trim()) return;
    if (editingPostId) {
      setPosts(prev => prev.map(p => p.id === editingPostId ? { ...p, content: composerContent.trim(), tag: composerTag } : p));
    } else {
      setPosts(prev => [{
        id: Date.now(), time: 'Just now', content: composerContent.trim(),
        likes: 0, comments: 0, reposts: 0, tag: composerTag, draft: false,
      }, ...prev]);
    }
    setShowPostComposer(false);
    setEditingPostId(null);
    setComposerContent('');
  };

  const handlePublishDraft = (id: number) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, draft: false, time: 'Just now' } : p));
  };

  const handleConfirmDeletePost = (id: number) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    setDeletePostId(null);
  };

  // Experience handlers
  const handleStartEditExperience = () => {
    setEditExperience(experience.map(e => ({ ...e })));
    setIsEditingExperience(true);
  };

  const handleSaveExperience = () => {
    setExperience(editExperience);
    setIsEditingExperience(false);
  };

  // Focus area handlers
  const handleAddFocusArea = () => {
    const trimmed = newFocusArea.trim();
    if (trimmed && !focusAreas.includes(trimmed)) {
      setFocusAreas(prev => [...prev, trimmed]);
      setNewFocusArea('');
    }
  };

  const handleRemoveFocusArea = (tag: string) => {
    setFocusAreas(prev => prev.filter(t => t !== tag));
  };

  // Saved tab handlers
  const handleOpenSavedItem = (item: SavedContentItem) => {
    if (item.surface === 'video') navigate(`/watch/${item.rawId}`);
    else if (item.surface === 'creators-reels') navigate(`/creators?openReel=${item.rawId}`);
    else navigate('/main/reels');
  };

  return (
    <>
      <div className="h-screen flex flex-col bg-white">
        <AppHeader />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 pt-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors">
              <ArrowBackIcon sx={{ fontSize: 16 }} />
              Back
            </button>
          </div>

          <div className="max-w-5xl mx-auto px-6 pt-6 pb-24 lg:pb-8">

            {/* Profile Header */}
            <div className="flex items-start gap-5 mb-5">
              <div className="relative group flex-shrink-0">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-xl ring-4 ring-white shadow-md overflow-hidden ${displayAvatarUrl ? '' : `bg-gradient-to-br ${avatarGradient}`}`}>
                  {displayAvatarUrl ? <img src={displayAvatarUrl} alt="Your avatar" className="w-full h-full object-cover" /> : initials}
                </div>
                <button onClick={handleAvatarClick} className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity flex items-center justify-center">
                  <EditIcon sx={{ fontSize: 18, color: 'white' }} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              <div className="flex-1 pt-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h1 className="text-2xl font-bold tracking-tight break-words">{displayName}</h1>
                      <svg className="w-5 h-5 text-brand flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm mb-3">{displayHandle}</p>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                      <div className="whitespace-nowrap"><span className="font-bold">127K</span><span className="text-gray-500 ml-1">followers</span></div>
                      <div className="whitespace-nowrap"><span className="font-bold">342</span><span className="text-gray-500 ml-1">following</span></div>
                      <div className="whitespace-nowrap"><span className="font-bold">{posts.filter(p => !p.draft).length + videos.length}</span><span className="text-gray-500 ml-1">posts</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handleShare}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${shareCopied ? 'bg-brand/10 text-brand' : 'hover:bg-gray-100 text-gray-500'}`}
                      title="Share profile"
                    >
                      {shareCopied ? <CheckIcon sx={{ fontSize: 15 }} /> : <ShareIcon sx={{ fontSize: 15 }} />}
                      {shareCopied ? 'Copied!' : 'Share'}
                    </button>
                    <button onClick={() => navigate('/account')} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0" title="Settings">
                      <SettingsIcon sx={{ fontSize: 20, color: '#6b7280' }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm leading-relaxed text-gray-600 mb-4 max-w-2xl">
              {bio}<span className="text-gray-400"> · Not financial advice.</span>
            </p>

            {/* Private Stats Bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                <span className="text-xs text-gray-500 whitespace-nowrap">Visible to you only</span>
              </div>
              <div className="h-3 w-px bg-gray-300 hidden sm:block" />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                <div className="whitespace-nowrap"><span className="font-semibold text-black">$2,340</span><span className="text-gray-500 ml-1">earned this month</span></div>
                <div className="whitespace-nowrap"><span className="font-semibold text-black">1.2K</span><span className="text-gray-500 ml-1">subscribers</span></div>
                <div className="whitespace-nowrap"><span className="font-semibold text-black">8,432</span><span className="text-gray-500 ml-1">profile views</span></div>
                <div className="whitespace-nowrap"><span className="font-semibold text-black">4.8%</span><span className="text-gray-500 ml-1">engagement rate</span></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <button
                onClick={() => { setEditName(displayName); setEditHandle(displayHandle); setProfileSaveError(null); setShowEditProfile(true); }}
                className="px-6 py-2 bg-black text-white font-medium text-sm rounded-full hover:bg-black/80 transition-colors flex items-center gap-2"
              >
                <EditIcon sx={{ fontSize: 15 }} />
                Edit Profile
              </button>
              <button
                onClick={() => navigate('/profile/investment')}
                className="px-6 py-2 bg-mint text-black font-medium text-sm rounded-full hover:bg-mint-hover transition-colors"
              >
                Preview Public Page
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-8">
              <div className="flex gap-8 overflow-x-auto no-scrollbar">
                {(['investment', 'videos', 'posts', 'saved', 'watching', 'about', 'analytics'] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 whitespace-nowrap pb-3 px-1 font-medium text-sm border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* ── INVESTMENT TAB ── */}
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
                      className={`relative w-11 h-6 rounded-full transition-colors ${simulatorMode ? 'bg-brand' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${simulatorMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  )}
                </div>

                {simulatorMode ? (
                  /* ── Simulator View ── */
                  <div className="space-y-4">
                    {/* Simulation Picker + Create */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 overflow-x-auto flex-1 pb-1">
                        {simulations.map(sim => (
                          <button
                            key={sim.id}
                            onClick={() => { setSelectedSimulationId(sim.id); setSimulationExpanded(false); }}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                              sim.id === selectedSimulationId ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {sim.name}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowNewSimulationForm(true)}
                        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-full text-xs font-medium hover:bg-black/80 transition-colors"
                      >
                        <AddIcon sx={{ fontSize: 14 }} />
                        New
                      </button>
                    </div>

                    {/* Simulation Setup */}
                    <div onClick={() => setSimulationExpanded(!simulationExpanded)} className="p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold">{selectedSimulation.name}</h2>
                        <svg className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${simulationExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {!simulationExpanded ? (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600"><span className="font-medium">Period:</span> {selectedSimulation.startDate}{selectedSimulation.endDate ? ` – ${selectedSimulation.endDate}` : ' – Present'}</p>
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Holdings:</span>{' '}
                            {selectedSimulation.holdings.length > 0
                              ? `${selectedSimulation.holdings.length} stock${selectedSimulation.holdings.length > 1 ? 's' : ''} (${selectedSimulation.holdings.map(h => h.symbol).join(', ')}) + Cash`
                              : 'All cash'}
                          </p>
                          <p className="text-xs text-gray-600"><span className="font-medium">Capital:</span> ${selectedSimulation.capital.toLocaleString()}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
                              <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs">{selectedSimulation.startDate}</div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Initial Capital</label>
                              <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs">${selectedSimulation.capital.toLocaleString()}</div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Hypothetical Holdings</label>
                            <div className="space-y-1.5">
                              {selectedSimulation.holdings.map(h => (
                                <div key={h.symbol} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs flex items-center justify-between">
                                  <span>{h.symbol}</span><span className="text-gray-500">${h.amount.toLocaleString()}</span>
                                </div>
                              ))}
                              {selectedSimCash > 0 && (
                                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs flex items-center justify-between">
                                  <span>Cash</span><span className="text-gray-500">${selectedSimCash.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {selectedSimulation.rationale && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Rationale</label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">{selectedSimulation.rationale}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Performance Comparison */}
                    <div>
                      <h2 className="text-base font-semibold mb-3">Hypothesis vs Actual Performance</h2>
                      {!hasSimPerformance ? (
                        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
                          <p className="text-sm font-medium text-gray-700 mb-1">This simulation just started</p>
                          <p className="text-xs text-gray-500">Performance data will appear here once enough time has passed to compare your hypothesis against the market.</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <p className="text-xs text-gray-600 mb-1">Your Hypothesis</p>
                              <p className="text-xl font-bold text-purple-700 mb-0.5">{selectedSimulation.hypothesisPercent! >= 0 ? '+' : ''}{selectedSimulation.hypothesisPercent!.toFixed(1)}%</p>
                              <p className="text-xs text-gray-500">${simHypothesisValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-xs text-gray-600 mb-1">Actual Performance</p>
                              <p className="text-xl font-bold text-brand mb-0.5">{selectedSimulation.actualPercent! >= 0 ? '+' : ''}{selectedSimulation.actualPercent!.toFixed(1)}%</p>
                              <p className="text-xs text-gray-500">${simActualValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className={`p-3 rounded-lg border ${simDiffPercent >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                              <p className="text-xs text-gray-600 mb-1">Difference</p>
                              <p className={`text-xl font-bold mb-0.5 ${simDiffPercent >= 0 ? 'text-brand' : 'text-red-700'}`}>{simDiffPercent >= 0 ? '+' : ''}{simDiffPercent.toFixed(1)}%</p>
                              <p className="text-xs text-gray-500">{simDiffValue >= 0 ? '+' : '-'}${Math.abs(simDiffValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="h-48 w-full">
                              <ResponsiveContainer width="100%" height={192}>
                                <LineChart key="sim-chart">
                                  <XAxis dataKey="time" hide key="sim-xaxis" />
                                  <YAxis hide domain={['dataMin', 'dataMax']} key="sim-yaxis" />
                                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={chartCurrencyFormatter('Value')} labelFormatter={hideChartLabel} />
                                  <Line data={portfolioData} type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} key="sim-actual" name="Actual" />
                                  <Line data={portfolioData.map(d => ({ ...d, value: d.value * 1.06 }))} type="monotone" dataKey="value" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} key="sim-hypothesis" name="Hypothesis" />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex items-center justify-center gap-4 mt-3">
                              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-brand" /><span className="text-xs font-medium">Actual</span></div>
                              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-purple-600" style={{ borderTop: '2px dashed #9333ea', height: 0 }} /><span className="text-xs font-medium">Hypothesis</span></div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Past Simulations */}
                    <button onClick={() => setShowSimulationList(!showSimulationList)} className="w-full p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors flex items-center justify-center gap-2 text-xs font-medium text-gray-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      {showSimulationList ? 'Hide Past Simulations' : 'View Past Simulations'}
                    </button>

                    {showSimulationList && (
                      <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-2.5">
                        <h3 className="font-semibold text-sm mb-3">Past Simulations</h3>
                        {[
                          { name: 'Tech Growth Portfolio', date: 'Dec 1, 2025 – Mar 1, 2026', holdings: '3 Holdings', capital: '$75,000', hypo: '+22.0%', actual: '+18.5%', diff: '-3.5%', diffPos: false },
                          { name: 'Conservative Value Play', date: 'Sep 1, 2025 – Dec 1, 2025', holdings: '4 Holdings', capital: '$100,000', hypo: '+8.0%', actual: '+11.2%', diff: '+3.2%', diffPos: true },
                          { name: 'Crypto Diversification Test', date: 'Jun 1, 2025 – Sep 1, 2025', holdings: '5 Holdings', capital: '$25,000', hypo: '+35.0%', actual: '-5.2%', diff: '-40.2%', diffPos: false },
                        ].map((sim) => (
                          <div key={sim.name} className="p-3 bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="font-medium text-sm">{sim.name}</h4>
                              <span className="text-xs text-gray-500">{sim.date}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-600 mb-1.5">
                              <span>{sim.holdings}</span><span>·</span><span>{sim.capital}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1.5"><span className="text-gray-500">Hypothesis:</span><span className="font-medium text-purple-700">{sim.hypo}</span></div>
                              <div className="flex items-center gap-1.5"><span className="text-gray-500">Actual:</span><span className={`font-medium ${sim.diffPos ? 'text-brand' : 'text-red-700'}`}>{sim.actual}</span></div>
                              <div className="flex items-center gap-1.5"><span className="text-gray-500">Diff:</span><span className={`font-medium ${sim.diffPos ? 'text-brand' : 'text-red-700'}`}>{sim.diff}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Real Portfolio View ── */
                  <div className="space-y-5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-full border border-brand/20">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Actual Portfolio
                      </span>
                      <span className="text-xs text-gray-400">Real positions · Updated daily</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold">Performance Chart</h2>
                        <p className="text-base font-medium text-brand">+2.66%</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height={192}>
                            <LineChart data={portfolioData} key="my-profile-line-chart">
                              <XAxis dataKey="time" hide key="my-profile-xaxis" />
                              <YAxis hide domain={['dataMin', 'dataMax']} key="my-profile-yaxis" />
                              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={chartCurrencyFormatter('Value')} labelFormatter={hideChartLabel} />
                              <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} key="my-profile-line" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-3 mt-3 text-xs font-medium">
                          {(['1W', '1M', '3M', '1Y', 'ALL'] as const).map((r) => (
                            <button key={r} onClick={() => setTimeRange(r)} className={`px-2.5 py-1 rounded transition-colors ${timeRange === r ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:bg-white hover:text-black'}`}>{r}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-base font-semibold mb-3">Portfolio Allocation</h2>
                      <div className="flex items-center gap-8">
                        <div className="w-44 h-44 flex-shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={ALLOCATION_DATA} cx="50%" cy="50%" innerRadius={46} outerRadius={84} paddingAngle={2} dataKey="value" isAnimationActive={false} key="my-profile-pie">
                                {ALLOCATION_DATA.map((entry, idx) => <Cell key={`my-profile-cell-${entry.name}-${idx}`} fill={entry.color} />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-3">
                          {ALLOCATION_DATA.map((item) => (
                            <div key={item.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-sm font-medium">{item.name}</span>
                              </div>
                              <span className="text-lg font-bold">{item.value}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── VIDEOS TAB ── */}
            {activeTab === 'videos' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold">Your Videos <span className="text-gray-400 font-normal text-sm ml-1">({videos.length})</span></h2>
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
                            <button onClick={() => setDeleteVideoId(null)} className="px-4 py-1.5 border border-gray-300 text-xs font-medium rounded-full hover:bg-gray-50 transition-colors">Cancel</button>
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
                            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-black"
                          />
                          <button onClick={() => handleSaveVideoTitle(video.id)} className="p-1 text-brand hover:bg-green-50 rounded transition-colors"><CheckIcon sx={{ fontSize: 16 }} /></button>
                          <button onClick={() => setEditingVideoId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"><CloseIcon sx={{ fontSize: 16 }} /></button>
                        </div>
                      ) : (
                        <h3 className="font-medium text-sm mb-1 line-clamp-2 leading-snug">{video.title}</h3>
                      )}
                      <p className="text-xs text-gray-400">{video.views} views · {video.uploadedAt}</p>

                      {/* Analytics panel */}
                      {analyticsVideoId === video.id && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <p className="text-xs font-semibold mb-2 text-gray-700">7-day views</p>
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
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <span>Avg watch time: <strong className="text-black">7:42</strong></span>
                            <span>CTR: <strong className="text-black">4.2%</strong></span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── POSTS TAB ── */}
            {activeTab === 'posts' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold">Your Posts <span className="text-gray-400 font-normal text-sm ml-1">({posts.filter(p => !p.draft).length} published · {posts.filter(p => p.draft).length} drafts)</span></h2>
                  <button onClick={handleOpenComposer} className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors">
                    <AddIcon sx={{ fontSize: 16 }} />
                    New Post
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {posts.map((post) => (
                    <div key={post.id} className={`bg-white border rounded-xl flex flex-col transition-colors ${post.draft ? 'border-dashed border-gray-300 bg-gray-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                      {/* Delete confirmation */}
                      {deletePostId === post.id ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
                          <p className="text-sm font-medium text-red-700 text-center">Delete this post?</p>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleConfirmDeletePost(post.id)} className="px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded-full hover:bg-red-700 transition-colors">Delete</button>
                            <button onClick={() => setDeletePostId(null)} className="px-4 py-1.5 border border-gray-300 text-xs font-medium rounded-full hover:bg-gray-50 transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{initials}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-sm">{displayName}</span>
                                {!post.draft && <svg className="w-3.5 h-3.5 text-brand" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <span>{displayHandle}</span><span>·</span>
                                <span className={post.draft ? 'text-amber-500 font-medium' : ''}>{post.time}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {post.draft && <span className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Draft</span>}
                              <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-500">{post.tag}</span>
                            </div>
                          </div>

                          <p className="text-sm text-gray-800 leading-relaxed flex-1 mb-3">{post.content}</p>

                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                            {post.draft ? (
                              <div className="flex items-center gap-2">
                                <button onClick={() => handlePublishDraft(post.id)} className="text-xs font-medium px-3 py-1.5 bg-black text-white rounded-full hover:bg-black/80 transition-colors">Publish</button>
                                <button onClick={() => handleOpenEditPost(post)} className="text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">Edit</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                  {post.likes.toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                  {post.comments}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                  {post.reposts.toLocaleString()}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleOpenEditPost(post)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" title="Edit">
                                <EditIcon sx={{ fontSize: 14, color: '#9ca3af' }} />
                              </button>
                              <button onClick={() => setDeletePostId(post.id)} className="p-1.5 hover:bg-red-50 rounded-full transition-colors" title="Delete">
                                <DeleteOutlineIcon sx={{ fontSize: 14, color: '#9ca3af' }} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SAVED TAB ── */}
            {activeTab === 'saved' && (
              <div>
                <h2 className="text-base font-semibold mb-5">Saved <span className="text-gray-400 font-normal text-sm ml-1">({savedItems.length})</span></h2>
                {savedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <BookmarkIcon sx={{ fontSize: 40, color: '#d1d5db' }} className="mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-1">No saved Reels yet.</p>
                    <p className="text-xs text-gray-500">Tap the bookmark icon on a Reel to save it here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {savedItems.map((item) => (
                      <div key={item.contentId} className="group">
                        <div
                          className="relative aspect-video rounded-xl overflow-hidden mb-2.5 cursor-pointer"
                          style={{ background: item.thumbnail }}
                          onClick={() => handleOpenSavedItem(item)}
                        >
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button onClick={() => handleOpenSavedItem(item)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors" title="Open">
                              <PlayArrowIcon sx={{ fontSize: 18, color: 'white' }} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeSavedContent(item.contentId); }}
                              className="p-2 bg-white/20 hover:bg-red-500/80 rounded-full transition-colors"
                              title="Remove from Saved"
                            >
                              <DeleteOutlineIcon sx={{ fontSize: 18, color: 'white' }} />
                            </button>
                          </div>
                        </div>
                        <h3 className="font-medium text-sm mb-1 line-clamp-2 leading-snug">{item.title}</h3>
                        <p className="text-xs text-gray-400">{item.creatorName}{item.meta ? ` · ${item.meta}` : ''}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── WATCHING TAB ── */}
            {activeTab === 'watching' && <WatchingTab />}

            {/* ── ABOUT TAB ── */}
            {activeTab === 'about' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="sm:col-span-2 space-y-5">
                  {/* Bio */}
                  <div className="p-5 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-semibold">About</h2>
                      {isEditingAbout ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setBio(editBio); setIsEditingAbout(false); }} className="text-xs font-medium px-3 py-1.5 bg-black text-white rounded-full hover:bg-black/80 transition-colors">Save</button>
                          <button onClick={() => setIsEditingAbout(false)} className="text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditBio(bio); setIsEditingAbout(true); }} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-black transition-colors">
                          <EditIcon sx={{ fontSize: 13 }} />Edit
                        </button>
                      )}
                    </div>
                    {isEditingAbout
                      ? <textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full text-sm text-gray-700 leading-relaxed border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-gray-400" rows={4} />
                      : <p className="text-sm text-gray-700 leading-relaxed">{bio}</p>
                    }
                  </div>

                  {/* Experience */}
                  <div className="p-5 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold">Experience</h3>
                      {isEditingExperience ? (
                        <div className="flex items-center gap-2">
                          <button onClick={handleSaveExperience} className="text-xs font-medium px-3 py-1.5 bg-black text-white rounded-full hover:bg-black/80 transition-colors">Save</button>
                          <button onClick={() => setIsEditingExperience(false)} className="text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={handleStartEditExperience} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-black transition-colors">
                          <EditIcon sx={{ fontSize: 13 }} />Edit
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {(isEditingExperience ? editExperience : experience).map((item, i) => (
                        <div key={i} className={`${isEditingExperience ? 'grid grid-cols-3 gap-2' : 'flex items-start justify-between'}`}>
                          {isEditingExperience ? (
                            <>
                              <input value={item.role} onChange={e => { const ex = [...editExperience]; ex[i] = { ...ex[i], role: e.target.value }; setEditExperience(ex); }} className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-black" placeholder="Role" />
                              <input value={item.org} onChange={e => { const ex = [...editExperience]; ex[i] = { ...ex[i], org: e.target.value }; setEditExperience(ex); }} className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-black" placeholder="Organization" />
                              <input value={item.years} onChange={e => { const ex = [...editExperience]; ex[i] = { ...ex[i], years: e.target.value }; setEditExperience(ex); }} className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-black" placeholder="Years" />
                            </>
                          ) : (
                            <>
                              <div>
                                <p className="text-sm font-medium">{item.role}</p>
                                <p className="text-xs text-gray-500">{item.org}</p>
                              </div>
                              <span className="text-xs text-gray-400 whitespace-nowrap">{item.years}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl">
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Disclaimer:</strong> Content is for educational purposes only and not financial advice. Always do your own research and consult a licensed advisor before making investment decisions.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Focus Areas */}
                  <div className="p-5 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold">Focus Areas</h3>
                      <button onClick={() => setIsEditingFocusAreas(prev => !prev)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-black transition-colors">
                        {isEditingFocusAreas ? <><CheckIcon sx={{ fontSize: 13 }} />Done</> : <><EditIcon sx={{ fontSize: 13 }} />Edit</>}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {focusAreas.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {tag}
                          {isEditingFocusAreas && (
                            <button onClick={() => handleRemoveFocusArea(tag)} className="text-gray-400 hover:text-red-500 transition-colors ml-0.5">
                              <CloseIcon sx={{ fontSize: 11 }} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {isEditingFocusAreas && (
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          value={newFocusArea}
                          onChange={e => setNewFocusArea(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddFocusArea(); }}
                          placeholder="Add area..."
                          className="flex-1 text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:border-black"
                        />
                        <button onClick={handleAddFocusArea} className="p-1.5 bg-black text-white rounded-full hover:bg-black/80 transition-colors">
                          <AddIcon sx={{ fontSize: 14 }} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-3">
                    <h3 className="text-base font-semibold">By the numbers</h3>
                    {[
                      { label: 'Followers', value: '127K' },
                      { label: 'Videos published', value: String(videos.length) },
                      { label: 'Posts published', value: String(posts.filter(p => !p.draft).length) },
                      { label: 'Joined', value: 'Jan 2020' },
                    ].map((stat) => (
                      <div key={stat.label} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{stat.label}</span>
                        <span className="font-semibold">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ANALYTICS TAB ── */}
            {activeTab === 'analytics' && (() => {
              const viewTrend = Array.from({ length: 30 }, (_, i) => ({
                day: `Day ${i + 1}`,
                views: Math.floor(3000 + Math.random() * 8000 + i * 120),
                watchTime: Math.floor(8000 + Math.random() * 15000 + i * 200),
              }));
              const followerTrend = Array.from({ length: 30 }, (_, i) => ({
                day: `Day ${i + 1}`,
                followers: 120000 + i * 230 + Math.floor(Math.random() * 400),
              }));
              const postEngagement = Array.from({ length: 14 }, (_, i) => ({
                day: `D${i + 1}`,
                likes: Math.floor(800 + Math.random() * 2000),
                comments: Math.floor(40 + Math.random() * 200),
                reposts: Math.floor(100 + Math.random() * 600),
              }));
              const topVideos = [
                { title: 'Why I Sold All My Tesla Stock', views: '567K', watchTime: '42min avg', ctr: '6.8%', trend: '+12%' },
                { title: 'How I Made $100K This Year', views: '421K', watchTime: '38min avg', ctr: '5.9%', trend: '+8%' },
                { title: 'Market Crash Coming? My Take', views: '312K', watchTime: '29min avg', ctr: '4.2%', trend: '+3%' },
                { title: '5 Stocks I\'m Buying in 2026', views: '234K', watchTime: '22min avg', ctr: '3.8%', trend: '-1%' },
                { title: 'Dividend Investing 101', views: '189K', watchTime: '19min avg', ctr: '3.1%', trend: '+5%' },
              ];
              const trafficSources = [
                { source: 'Direct / Home feed', pct: 38 },
                { source: 'Search', pct: 27 },
                { source: 'External links', pct: 18 },
                { source: 'Notifications', pct: 11 },
                { source: 'Other', pct: 6 },
              ];
              const milestones = [
                { icon: '🎉', text: 'Reached 127K followers', time: '2 days ago' },
                { icon: '🔥', text: '"Why I Sold Tesla" hit 500K views', time: '5 days ago' },
                { icon: '📈', text: 'Best week: 48K new views', time: '1 week ago' },
                { icon: '💬', text: '1,000+ comments this month', time: '2 weeks ago' },
              ];
              return (
                <div className="space-y-6">

                  {/* Overview cards */}
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Views (30d)', value: '184K', delta: '+12%', pos: true },
                      { label: 'Watch time (30d)', value: '9,240 hrs', delta: '+8%', pos: true },
                      { label: 'Subscribers gained', value: '+6,840', delta: '+21%', pos: true },
                      { label: 'Revenue (30d)', value: '$2,340', delta: '-3%', pos: false },
                    ].map((card) => (
                      <div key={card.label} className="p-4 bg-white border border-gray-200 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                        <p className="text-xl font-bold mb-0.5">{card.value}</p>
                        <span className={`text-xs font-medium ${card.pos ? 'text-brand' : 'text-red-500'}`}>{card.delta} vs last month</span>
                      </div>
                    ))}
                  </div>

                  {/* Video view trend */}
                  <div className="p-5 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold">Video Views — Last 30 days</h2>
                      <span className="text-xs text-gray-400">184,320 total</span>
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={viewTrend} key="analytics-views-chart">
                          <XAxis dataKey="day" hide key="analytics-views-xaxis" />
                          <YAxis hide key="analytics-views-yaxis" />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, padding: '6px 10px' }} formatter={(v: number) => [v.toLocaleString(), 'Views']} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey="views" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} key="analytics-views-line" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Top videos */}
                    <div className="p-5 bg-white border border-gray-200 rounded-xl">
                      <h2 className="text-base font-semibold mb-4">Top Videos</h2>
                      <div className="space-y-3">
                        {topVideos.map((v, i) => (
                          <div key={v.title} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{v.title}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                                <span>{v.views} views</span>
                                <span>·</span>
                                <span>{v.watchTime}</span>
                                <span>·</span>
                                <span>CTR {v.ctr}</span>
                              </div>
                            </div>
                            <span className={`text-xs font-semibold flex-shrink-0 ${v.trend.startsWith('+') ? 'text-brand' : 'text-red-500'}`}>{v.trend}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Follower growth */}
                    <div className="p-5 bg-white border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold">Follower Growth</h2>
                        <span className="text-xs text-gray-400">+6,840 this month</span>
                      </div>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={followerTrend} key="analytics-followers-chart">
                            <XAxis dataKey="day" hide key="analytics-followers-xaxis" />
                            <YAxis hide key="analytics-followers-yaxis" />
                            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, padding: '6px 10px' }} formatter={(v: number) => [v.toLocaleString(), 'Followers']} labelFormatter={() => ''} />
                            <Line type="monotone" dataKey="followers" stroke="var(--mint)" strokeWidth={2} dot={false} isAnimationActive={false} key="analytics-followers-line" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                        <span>Start: <strong className="text-black">120K</strong></span>
                        <span>Now: <strong className="text-black">127K</strong></span>
                        <span>Peak day: <strong className="text-black">+312</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Post engagement trends */}
                  <div className="p-5 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold">Post Engagement — Last 14 days</h2>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-brand" /><span>Likes</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-blue-400" /><span>Comments</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-purple-400" /><span>Reposts</span></div>
                      </div>
                    </div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={postEngagement} key="analytics-engagement-chart">
                          <XAxis dataKey="day" tick={{ fontSize: 10 }} key="analytics-engagement-xaxis" />
                          <YAxis hide key="analytics-engagement-yaxis" />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, padding: '6px 10px' }} />
                          <Line type="monotone" dataKey="likes" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={false} key="analytics-likes-line" />
                          <Line type="monotone" dataKey="comments" stroke="#60a5fa" strokeWidth={2} dot={false} isAnimationActive={false} key="analytics-comments-line" />
                          <Line type="monotone" dataKey="reposts" stroke="#a78bfa" strokeWidth={2} dot={false} isAnimationActive={false} key="analytics-reposts-line" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Traffic sources */}
                    <div className="p-5 bg-white border border-gray-200 rounded-xl">
                      <h2 className="text-base font-semibold mb-4">Traffic Sources</h2>
                      <div className="space-y-3">
                        {trafficSources.map((s) => (
                          <div key={s.source}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-700">{s.source}</span>
                              <span className="font-semibold">{s.pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${s.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent milestones */}
                    <div className="p-5 bg-white border border-gray-200 rounded-xl">
                      <h2 className="text-base font-semibold mb-4">Recent Milestones</h2>
                      <div className="space-y-3">
                        {milestones.map((m) => (
                          <div key={m.text} className="flex items-start gap-3">
                            <span className="text-lg leading-none mt-0.5">{m.icon}</span>
                            <div>
                              <p className="text-sm font-medium">{m.text}</p>
                              <p className="text-xs text-gray-400">{m.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

          </div>
        </div>
      </div>

      {/* ── New Simulation Modal ── */}
      {showNewSimulationForm && (() => {
        const enteredHoldingsTotal = newSimHoldings.reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
        const remainingCash = (parseFloat(newSimCapital) || 0) - enteredHoldingsTotal;
        const canCreate = newSimName.trim().length > 0 && parseFloat(newSimCapital) > 0;

        return (
          <Overlay onClose={handleCloseNewSimForm}>
            <div className="bg-white rounded-2xl shadow-xl w-[min(520px,90vw)] max-h-[85vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">New Simulation</h2>
                <button onClick={handleCloseNewSimForm} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon sx={{ fontSize: 18 }} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Simulation Name <span className="text-red-400">*</span></label>
                  <input
                    value={newSimName}
                    onChange={e => setNewSimName(e.target.value)}
                    placeholder="e.g. AI Growth Thesis"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={newSimStartDate}
                      min={getTodayISODate()}
                      onChange={e => setNewSimStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Initial Capital ($) <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      min="0"
                      value={newSimCapital}
                      onChange={e => setNewSimCapital(e.target.value)}
                      placeholder="50000"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Hypothetical Holdings</label>
                  <div className="space-y-2">
                    {newSimHoldings.map((holding, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={holding.symbol}
                          onChange={e => handleHoldingChange(i, 'symbol', e.target.value.toUpperCase())}
                          placeholder="Symbol (e.g. NVDA)"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                        />
                        <input
                          type="number"
                          min="0"
                          value={holding.amount}
                          onChange={e => handleHoldingChange(i, 'amount', e.target.value)}
                          placeholder="$ Amount"
                          className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                        />
                        {newSimHoldings.length > 1 && (
                          <button onClick={() => handleRemoveHoldingRow(i)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={handleAddHoldingRow} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-black transition-colors">
                    <AddIcon sx={{ fontSize: 14 }} />
                    Add holding
                  </button>
                  {newSimCapital && (
                    <p className={`text-xs mt-2 ${remainingCash < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {remainingCash < 0
                        ? `Holdings exceed capital by $${Math.abs(remainingCash).toLocaleString()}`
                        : `Remaining cash: $${remainingCash.toLocaleString()}`}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Rationale (optional)</label>
                  <textarea
                    value={newSimRationale}
                    onChange={e => setNewSimRationale(e.target.value)}
                    rows={3}
                    placeholder="Why are you testing this scenario?"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={handleCreateSimulation}
                  disabled={!canCreate}
                  className="flex-1 py-2.5 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Create Simulation
                </button>
                <button onClick={handleCloseNewSimForm} className="flex-1 py-2.5 border border-gray-200 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            </div>
          </Overlay>
        );
      })()}

      {/* ── Edit Profile Modal ── */}
      {showEditProfile && (
        <Overlay onClose={() => setShowEditProfile(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[min(480px,90vw)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Edit Profile</h2>
              <button onClick={() => setShowEditProfile(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon sx={{ fontSize: 18 }} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Display Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Handle</label>
                <input value={editHandle} onChange={e => setEditHandle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors" />
              </div>
            </div>
            {profileSaveError && <p className="text-sm text-red-500 mt-3">{profileSaveError}</p>}
            <div className="flex items-center gap-2 mt-6">
              <button onClick={handleSaveProfile} disabled={savingProfile} className="flex-1 py-2.5 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setShowEditProfile(false)} className="flex-1 py-2.5 border border-gray-200 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── Upload Video Modal ── */}
      {showUploadModal && (
        <Overlay onClose={handleCloseUploadModal}>
          <div className="bg-white rounded-2xl shadow-xl w-[min(520px,90vw)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Upload Video</h2>
              <button onClick={handleCloseUploadModal} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon sx={{ fontSize: 18 }} /></button>
            </div>

            {/* Upload zone */}
            <input
              ref={videoFileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={e => handleVideoFileSelected(e.target.files?.[0])}
            />
            <div
              onClick={() => videoFileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDraggingVideo(true); }}
              onDragLeave={() => setIsDraggingVideo(false)}
              onDrop={e => { e.preventDefault(); setIsDraggingVideo(false); handleVideoFileSelected(e.dataTransfer.files?.[0]); }}
              className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 transition-colors cursor-pointer ${isDraggingVideo ? 'border-brand bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="text-3xl mb-2">🎬</div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {processingUpload ? 'Processing video…' : uploadFileName ? `Selected: ${uploadFileName}` : 'Drop your video here or click to browse'}
              </p>
              <p className="text-xs text-gray-400">MP4, MOV, or WEBM up to 4GB</p>
            </div>
            {uploadError && <p className="text-sm text-red-500 mb-4">{uploadError}</p>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Title <span className="text-red-400">*</span></label>
                <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="Give your video a title..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors" />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button onClick={handleUploadVideo} disabled={!uploadTitle.trim() || !uploadFile || processingUpload} className="flex-1 py-2.5 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {processingUpload ? 'Uploading…' : 'Upload'}
              </button>
              <button onClick={handleCloseUploadModal} className="flex-1 py-2.5 border border-gray-200 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── Post Composer Modal ── */}
      {showPostComposer && (
        <Overlay onClose={() => { setShowPostComposer(false); setEditingPostId(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-[min(540px,90vw)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{editingPostId ? 'Edit Post' : 'New Post'}</h2>
              <button onClick={() => { setShowPostComposer(false); setEditingPostId(null); }} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><CloseIcon sx={{ fontSize: 18 }} /></button>
            </div>

            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{initials}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs text-gray-400">{displayHandle}</p>
              </div>
            </div>

            <textarea
              autoFocus
              value={composerContent}
              onChange={e => setComposerContent(e.target.value)}
              placeholder="What's on your mind? Share an investing insight..."
              rows={5}
              className="w-full text-sm text-gray-800 border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-black transition-colors mb-4"
            />

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-2">Tag</label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(t => (
                  <button
                    key={t}
                    onClick={() => setComposerTag(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${composerTag === t ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{composerContent.length} / 500</span>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowPostComposer(false); setEditingPostId(null); }} className="px-5 py-2 border border-gray-200 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleSavePost} disabled={!composerContent.trim()} className="px-5 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {editingPostId ? 'Save' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}
