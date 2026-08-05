import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PeopleIcon from '@mui/icons-material/People';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PersonIcon from '@mui/icons-material/Person';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import SearchModal from './SearchModal';
import RiskBanner from './AppHeader/RiskBanner';
import CreateOptionsSheet, { type CreateContentType } from './CreateOptionsSheet';
import CreatePostModal from './CreatePostModal';
import CreateReelModal from './CreateReelModal';
import UploadVideoModal from './UploadVideoModal';
import { useAuth } from '../contexts/AuthContext';
import { useServiceQuery } from '../hooks/useServiceQuery';
import { getUnreadCount, subscribeToNotifications } from '../../lib/services/notifications.service';
import { getUnreadMessageCount, subscribeToMessages } from '../../lib/services/messages.service';

export default function AppHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, profile } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const ticker = searchParams.get('ticker')?.toUpperCase() ?? null;
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Create bottom sheet + whichever composer it opens — self-contained here so every page
  // gets the same "+" behavior without each page owning its own create modal/FAB.
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [activeCreateModal, setActiveCreateModal] = useState<CreateContentType | null>(null);

  const handleSelectCreateType = (type: CreateContentType) => {
    setShowCreateSheet(false);
    setActiveCreateModal(type);
  };

  const { data: unreadCountData } = useServiceQuery(
    () => getUnreadCount(user!.id),
    [user?.id],
    { enabled: !!user, label: 'notifications' },
  );
  useEffect(() => setUnreadCount(unreadCountData ?? 0), [unreadCountData]);

  useEffect(() => {
    if (!user) return;
    const channel = subscribeToNotifications(user.id, () => {
      setUnreadCount(prev => prev + 1);
    });
    return () => { channel.unsubscribe(); };
  }, [user]);

  const { data: unreadMessageCountData } = useServiceQuery(
    () => getUnreadMessageCount(user!.id),
    [user?.id],
    { enabled: !!user, label: 'messages' },
  );
  useEffect(() => setUnreadMessageCount(unreadMessageCountData ?? 0), [unreadMessageCountData]);

  useEffect(() => {
    if (!user) return;
    const channel = subscribeToMessages(user.id, () => {
      setUnreadMessageCount(prev => prev + 1);
    }, 'badge');
    return () => { channel.unsubscribe(); };
  }, [user]);


  const active = (paths: string[]) =>
    paths.some(p => pathname === p || pathname.startsWith(p + '/'));

  const cls = (paths: string[]) =>
    `hover:opacity-70 transition-opacity ${active(paths) ? 'text-brand' : ''}`;

  return (
    <>
      {/* Announcement banner — desktop only */}
      <div className="hidden lg:block bg-mint py-2 px-4 text-center text-sm font-medium border-b border-black/10 shrink-0">
        Learn from verified creators, track your investment thesis, and build real conviction.
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <h1
          onClick={() => navigate('/main')}
          className="text-xl font-bold tracking-tight cursor-pointer"
        >
          Gazua
        </h1>
        <div className="flex items-center gap-2">
          {ticker && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold rounded-full">
              <span>${ticker}</span>
              <button
                onClick={() => setSearchParams({})}
                className="flex items-center hover:text-blue-900"
                aria-label="Clear ticker filter"
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Search"
          >
            <SearchIcon sx={{ fontSize: 22 }} />
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Notifications"
          >
            {active(['/notifications'])
              ? <NotificationsIcon sx={{ fontSize: 22 }} />
              : <NotificationsNoneIcon sx={{ fontSize: 22 }} />}
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-brand rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Desktop header */}
      <header className="hidden lg:block border-b border-gray-200 bg-white shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1
              onClick={() => navigate('/main')}
              className="text-2xl font-bold tracking-tight cursor-pointer"
            >
              Gazua
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSearch(true)}
                className="relative flex items-center w-80"
              >
                <SearchIcon
                  sx={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 16,
                    color: 'var(--icon-muted)',
                  }}
                />
                <div className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-full text-sm text-left text-gray-500 hover:border-gray-300 transition-colors cursor-pointer">
                  Search
                </div>
              </button>
              {ticker && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold rounded-full whitespace-nowrap">
                  <span>${ticker}</span>
                  <button
                    onClick={() => setSearchParams({})}
                    className="ml-0.5 hover:text-blue-900 flex items-center"
                    aria-label="Clear ticker filter"
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <button onClick={() => navigate('/main')} className={cls(['/main', '/home'])}>
              Home
            </button>
            <button onClick={() => navigate('/creators')} className={cls(['/creators', '/profile'])}>
              Creators
            </button>
            <button onClick={() => navigate('/my-profile')} className={cls(['/my-profile'])}>
              My Profile
            </button>
            <button onClick={() => navigate('/messages')} className={`relative ${cls(['/messages'])}`}>
              Messages
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-2.5 w-2 h-2 bg-brand rounded-full" />
              )}
            </button>
            <button onClick={() => navigate('/my-profile/settings')} className={cls(['/my-profile/settings'])}>
              Account
            </button>
            {profile?.role === 'admin' && (
              <button onClick={() => navigate('/admin')} className={cls(['/admin'])}>
                Admin
              </button>
            )}
            <button
              onClick={() => navigate('/notifications')}
              className={`relative p-2 -m-2 rounded-full hover:bg-gray-100 transition-colors ${active(['/notifications']) ? 'text-brand' : ''}`}
              aria-label="Notifications"
            >
              {active(['/notifications'])
                ? <NotificationsIcon sx={{ fontSize: 20 }} />
                : <NotificationsNoneIcon sx={{ fontSize: 20 }} />}
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-brand rounded-full" />
              )}
            </button>
          </nav>
        </div>
      </header>

      <RiskBanner />

      {/* Mobile bottom nav — Home, Creators, [+ Create], Messages, Profile. Account no longer
          lives here; its content moved to My Profile > Settings (gear icon), reached the same
          way as before but nested under Profile instead of being its own tab. */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          <button
            onClick={() => navigate('/main')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${active(['/main', '/home']) ? 'text-brand' : 'text-gray-500'}`}
          >
            {active(['/main', '/home'])
              ? <HomeIcon sx={{ fontSize: 24 }} />
              : <HomeOutlinedIcon sx={{ fontSize: 24 }} />}
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button
            onClick={() => navigate('/creators')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${active(['/creators', '/profile']) ? 'text-brand' : 'text-gray-500'}`}
          >
            {active(['/creators', '/profile'])
              ? <PeopleIcon sx={{ fontSize: 24 }} />
              : <PeopleOutlinedIcon sx={{ fontSize: 24 }} />}
            <span className="text-[10px] font-medium">Creators</span>
          </button>

          <button
            onClick={() => setShowCreateSheet(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${showCreateSheet || activeCreateModal ? 'text-brand' : 'text-gray-500'}`}
          >
            {showCreateSheet || activeCreateModal
              ? <AddCircleIcon sx={{ fontSize: 24 }} />
              : <AddCircleOutlineIcon sx={{ fontSize: 24 }} />}
            <span className="text-[10px] font-medium">Create</span>
          </button>

          <button
            onClick={() => navigate('/messages')}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${active(['/messages']) ? 'text-brand' : 'text-gray-500'}`}
          >
            {active(['/messages'])
              ? <ChatBubbleIcon sx={{ fontSize: 24 }} />
              : <ChatBubbleOutlineIcon sx={{ fontSize: 24 }} />}
            {unreadMessageCount > 0 && (
              <span className="absolute top-0 right-4 w-2 h-2 bg-brand rounded-full" />
            )}
            <span className="text-[10px] font-medium">Messages</span>
          </button>
          <button
            onClick={() => navigate('/my-profile')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${active(['/my-profile']) ? 'text-brand' : 'text-gray-500'}`}
          >
            {active(['/my-profile'])
              ? <PersonIcon sx={{ fontSize: 24 }} />
              : <PersonOutlineIcon sx={{ fontSize: 24 }} />}
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>

      {/* Desktop Create FAB — mobile reaches the same picker via the bottom nav's + tab above,
          so this only needs to exist at lg and up (matches CreateOptionsSheet's own desktop
          breakpoint, which is what switches it from a bottom sheet to a centered dialog). */}
      <button
        onClick={() => setShowCreateSheet(true)}
        className="hidden lg:flex fixed bottom-8 right-8 w-14 h-14 bg-mint text-black rounded-full shadow-lg hover:bg-mint-hover hover:shadow-xl transition-all items-center justify-center z-40"
        aria-label="Create"
      >
        <AddIcon sx={{ fontSize: 28 }} />
      </button>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      <AnimatePresence>
        {showCreateSheet && (
          <CreateOptionsSheet
            onClose={() => setShowCreateSheet(false)}
            onSelect={handleSelectCreateType}
          />
        )}
      </AnimatePresence>

      {activeCreateModal === 'post' && (
        <CreatePostModal
          onClose={() => setActiveCreateModal(null)}
          onSuccess={(msg) => { setActiveCreateModal(null); toast.success(msg); navigate('/main'); }}
        />
      )}
      {activeCreateModal === 'reel' && (
        <CreateReelModal
          onClose={() => setActiveCreateModal(null)}
          onSuccess={(msg) => { setActiveCreateModal(null); toast.success(msg); navigate('/main/reels'); }}
        />
      )}
      {activeCreateModal === 'video' && (
        <UploadVideoModal
          onClose={() => setActiveCreateModal(null)}
          onSuccess={(msg) => { setActiveCreateModal(null); toast.success(msg); navigate('/my-profile?tab=videos'); }}
        />
      )}
    </>
  );
}
