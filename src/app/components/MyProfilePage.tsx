import { useState, useMemo, useRef, type ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useMyProfileVideos } from '../hooks/useMyProfileVideos';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import ShareIcon from '@mui/icons-material/Share';
import CheckIcon from '@mui/icons-material/Check';
import AppHeader from './AppHeader';
import WatchingTab from './WatchingTab';
import InvestmentTab from './myProfile/InvestmentTab';
import VideosTab from './myProfile/VideosTab';
import PostsTab, { INIT_POSTS, type ProfilePost } from './myProfile/PostsTab';
import SavedTab from './myProfile/SavedTab';
import AboutTab from './myProfile/AboutTab';
import AnalyticsTab from './myProfile/AnalyticsTab';
import EditProfileModal from './myProfile/EditProfileModal';
import TabPanel from './myProfile/TabPanel';
import VerifiedBadge from './VerifiedBadge';
import { isCreatorVerified } from '../utils/creator';

type Tab = 'investment' | 'videos' | 'posts' | 'saved' | 'watching' | 'about' | 'analytics';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Profile shell: avatar/name/bio/stats header + tab bar, delegating each tab's own state and
// markup to src/app/components/myProfile/*Tab.tsx (see audit Issue 11 — this file was 1,533
// lines before the split). Only state genuinely needed by more than one tab (or the header
// itself) lives here: identity/avatar, videos (header + About both show counts), posts (same).
export default function MyProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return t === 'watching' || t === 'videos' ? t : 'investment';
  });

  // Profile identity — comes from the real authenticated profile, not local mock state.
  // avatarImageUrl is a local-only preview override until avatar upload is wired to real
  // Storage (see UploadVideoModal for the model to follow when that's done).
  const displayName = profile?.full_name || '';
  const displayHandle = profile?.handle ? `@${profile.handle}` : profile?.username ? `@${profile.username}` : '';
  const bioText = profile?.bio?.trim() || '';
  const avatarGradient = 'from-blue-500 to-purple-600';
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null);
  const displayAvatarUrl = avatarImageUrl ?? profile?.avatar_url ?? null;
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const { videos, setVideos, refreshVideos } = useMyProfileVideos(profile?.id);
  const [posts, setPosts] = useState<ProfilePost[]>(INIT_POSTS);

  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const handleShare = () => {
    if (!profile?.username) return;
    navigator.clipboard?.writeText(`${window.location.origin}/profile/${profile.username}/investment`)
      .then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      })
      .catch(() => {
        toast.error('Could not copy link. Please try again.');
      });
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

  return (
    <>
      <div className="h-screen flex flex-col bg-white">
        <AppHeader />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 pt-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-black transition-colors">
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
                      {isCreatorVerified(profile) && <VerifiedBadge size={20} />}
                    </div>
                    <p className="text-neutral-500 text-sm mb-3">{displayHandle}</p>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                      <div className="whitespace-nowrap"><span className="font-bold">127K</span><span className="text-neutral-500 ml-1">followers</span></div>
                      <div className="whitespace-nowrap"><span className="font-bold">342</span><span className="text-neutral-500 ml-1">following</span></div>
                      <div className="whitespace-nowrap"><span className="font-bold">{posts.filter(p => !p.draft).length + videos.length}</span><span className="text-neutral-500 ml-1">posts</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handleShare}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${shareCopied ? 'bg-brand/10 text-brand' : 'hover:bg-neutral-100 text-neutral-500'}`}
                      title="Share profile"
                    >
                      {shareCopied ? <CheckIcon sx={{ fontSize: 15 }} /> : <ShareIcon sx={{ fontSize: 15 }} />}
                      {shareCopied ? 'Copied!' : 'Share'}
                    </button>
                    <button onClick={() => navigate('/my-profile/settings')} className="p-2 hover:bg-neutral-100 rounded-full transition-colors flex-shrink-0" title="Settings">
                      <SettingsIcon sx={{ fontSize: 20, color: '#6b7280' }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm leading-relaxed text-neutral-600 mb-4 max-w-2xl">
              {bioText || <span className="text-neutral-400 italic">Tell people about yourself</span>}
              <span className="text-neutral-400"> · Not financial advice.</span>
            </p>


            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <button
                onClick={() => setShowEditProfile(true)}
                className="px-6 py-2 bg-black text-white font-medium text-sm rounded-full hover:bg-black/80 transition-colors flex items-center gap-2"
              >
                <EditIcon sx={{ fontSize: 15 }} />
                Edit Profile
              </button>
              {profile?.username && (
                <button
                  onClick={() => navigate(`/profile/${profile.username}/investment`)}
                  className="px-6 py-2 bg-mint text-black font-medium text-sm rounded-full hover:bg-mint-hover transition-colors"
                >
                  Preview Public Page
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-neutral-200 mb-8">
              <div className="flex gap-8 overflow-x-auto no-scrollbar">
                {(['investment', 'videos', 'posts', 'saved', 'watching', 'about', 'analytics'] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 whitespace-nowrap pb-3 px-1 font-medium text-sm border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Every tab stays mounted (hidden via TabPanel, not unmounted via && ) once
                visited — each *Tab.tsx owns in-progress state (an open editor, an unsaved form
                draft, a scroll position) that would otherwise reset the instant you switched
                away and back, since a conditionally-rendered subtree unmounts and remounts
                fresh. See TabPanel.tsx for why hiding it also needs more than a CSS class. */}
            {(['investment', 'videos', 'posts', 'saved', 'watching', 'about', 'analytics'] as Tab[]).map((tab) => (
              <TabPanel key={tab} active={activeTab === tab}>
                {tab === 'investment' && <InvestmentTab />}
                {tab === 'videos' && <VideosTab videos={videos} setVideos={setVideos} refreshVideos={refreshVideos} />}
                {tab === 'posts' && (
                  <PostsTab posts={posts} setPosts={setPosts} displayName={displayName} displayHandle={displayHandle} initials={initials} />
                )}
                {tab === 'saved' && <SavedTab />}
                {tab === 'watching' && <WatchingTab />}
                {tab === 'about' && (
                  <AboutTab
                    bioText={bioText}
                    onEditProfile={() => setShowEditProfile(true)}
                    videosCount={videos.length}
                    postsCount={posts.filter(p => !p.draft).length}
                  />
                )}
                {tab === 'analytics' && <AnalyticsTab />}
              </TabPanel>
            ))}

          </div>
        </div>
      </div>

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
    </>
  );
}
