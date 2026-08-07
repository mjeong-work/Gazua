import { useState } from 'react';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ShareIcon from '@mui/icons-material/Share';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SubscriptionModal from '../SubscriptionModal';
import CreatorChatWidget from '../CreatorChatWidget';
import VerifiedBadge from '../VerifiedBadge';
import { Button } from '../ui/button';
import { useFollow } from '../../contexts/FollowContext';
import { SUBSCRIBE_ENABLED } from '../../featureFlags';
import type { MockCreator } from '../../data/creators';
import type { Profile } from '../../../types/database';

interface CreatorProfileHeaderProps {
  creatorId: string;
  creator: MockCreator;
  dbProfile: Profile | null;
  followerCount: number | null;
  followingCount: number | null;
  postCount: number | null;
}

// Shared by CreatorProfileInvestment and CreatorProfileVideos — avatar, name/verified/handle,
// follower-following-post counts, notification/share/more actions, bio, and the Follow/
// Subscribe/Message action row, plus the modals and toast those actions open. Previously
// duplicated near-verbatim in both page files (audit finding); this is the single place a
// future header fix needs to land.
export default function CreatorProfileHeader({
  creatorId,
  creator,
  dbProfile,
  followerCount,
  followingCount,
  postCount,
}: CreatorProfileHeaderProps) {
  const [notificationsOn, setNotificationsOn] = useState(() => {
    try { return localStorage.getItem(`gazua:notif:${creatorId}`) === 'true'; } catch { return false; }
  });
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const { isFollowing: isFollowingFn, toggleFollow } = useFollow();
  const followKey = dbProfile?.id ?? creatorId;
  const isFollowingCreator = isFollowingFn(followKey);
  const handleFollowToggle = async () => { await toggleFollow(followKey); };

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    triggerToast('Profile link copied to clipboard');
  };

  return (
    <>
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
                  <VerifiedBadge size={24} title="Portfolio allocation verified by Gazua" />
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
                className="icon-tap-target p-2 hover:bg-neutral-100 rounded-full transition-colors"
                title="Toggle notifications"
              >
                {notificationsOn
                  ? <NotificationsActiveIcon sx={{ fontSize: 20, color: 'var(--brand)' }} />
                  : <NotificationsIcon sx={{ fontSize: 20 }} />
                }
              </button>
              <button onClick={handleShare} className="icon-tap-target p-2 hover:bg-neutral-100 rounded-full transition-colors" title="Share profile">
                <ShareIcon sx={{ fontSize: 20 }} />
              </button>
              <div className="relative">
                <button onClick={() => setShowMoreMenu(v => !v)} className="icon-tap-target p-2 hover:bg-neutral-100 rounded-full transition-colors">
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

          <p className="text-sm leading-relaxed mb-6 max-w-2xl">
            {creator.bio || <span className="text-neutral-400 italic">This creator hasn't added a bio yet.</span>}
          </p>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              onClick={handleFollowToggle}
              variant="pill"
              size="pill"
              className={`px-6 sm:px-8 ${isFollowingCreator ? 'bg-neutral-200 text-black hover:bg-neutral-300' : ''}`}
            >
              {isFollowingCreator ? 'Following' : 'Follow'}
            </Button>
            {SUBSCRIBE_ENABLED && (
              <Button
                onClick={() => setShowSubscribeModal(true)}
                variant="pillMint"
                size="pill"
                className="px-6 sm:px-8"
              >
                Subscribe
              </Button>
            )}
            {dbProfile && (
              <Button
                onClick={() => setShowChat(true)}
                variant="pill"
                size="pill"
                className="px-5 sm:px-6 bg-neutral-100 text-black hover:bg-neutral-200"
              >
                Message
              </Button>
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-brand text-white px-6 py-4 rounded-xl shadow-lg z-50 animate-slide-up pointer-events-none">
          <p className="font-bold">{toastMessage}</p>
        </div>
      )}
    </>
  );
}
