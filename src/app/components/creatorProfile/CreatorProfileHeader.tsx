import { useState } from 'react';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ShareIcon from '@mui/icons-material/Share';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SubscriptionModal from '../SubscriptionModal';
import CreatorChatWidget from '../CreatorChatWidget';
import VerifiedBadge from '../VerifiedBadge';
import ReportButton from '../compliance/ReportButton';
import { Button } from '../ui/button';
import Avatar from '../shared/Avatar';
import RiskPill from '../shared/RiskPill';
import StatRow from '../shared/StatRow';
import AllocationBar from '../shared/AllocationBar';
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

  const focusAreas = dbProfile?.tags?.length ? dbProfile.tags : creator.focus ? [creator.focus] : [];

  // Rendered twice — mobile (end of stack) and desktop (top of the left rail) — same reasoning
  // as MyProfilePage's renderProfileActionButtons: the *position* genuinely differs by
  // breakpoint, not just the styling.
  const renderActionButtons = () => (
    <>
      <Button
        onClick={handleFollowToggle}
        variant="pill"
        size="pill"
        className={`px-6 ${isFollowingCreator ? 'bg-neutral-200 text-black hover:bg-neutral-300' : ''}`}
      >
        {isFollowingCreator ? 'Following' : 'Follow'}
      </Button>
      {SUBSCRIBE_ENABLED && (
        <Button onClick={() => setShowSubscribeModal(true)} variant="pillMint" size="pill" className="px-6">
          Subscribe
        </Button>
      )}
      {dbProfile && (
        <Button
          onClick={() => setShowChat(true)}
          variant="pill"
          size="pill"
          className="px-5 bg-neutral-100 text-black hover:bg-neutral-200"
        >
          Message
        </Button>
      )}
    </>
  );

  return (
    <>
      {/* Same mobile-stack / desktop-left-rail+right-column pattern as MyProfilePage's header
          (see MyProfilePage.tsx for the full rationale on why the action buttons render twice). */}
      <div className="flex flex-col gap-3 md:flex-row md:gap-10 md:items-start mb-6 md:mb-8">
        {/* Left rail (desktop) / top block (mobile) */}
        <div className="md:w-80 md:flex-shrink-0 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar
              imageUrl={dbProfile?.avatar_url}
              initials={creator.avatar}
              gradientClass="from-neutral-100 to-neutral-100"
              verified={creator.verified}
              className="w-16 h-16 text-3xl md:w-24 md:h-24 md:text-5xl"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg md:text-2xl font-bold truncate">{creator.name}</h1>
                {creator.verified && (
                  <>
                    <VerifiedBadge size={16} title="Portfolio allocation verified by Gazua" className="md:hidden" />
                    <VerifiedBadge size={20} title="Portfolio allocation verified by Gazua" className="hidden md:inline-flex" />
                  </>
                )}
              </div>
              <p className="text-neutral-500 text-xs md:text-sm truncate">{creator.handle}</p>
            </div>

            {/* Action icons */}
            <div className="flex items-center gap-1 flex-shrink-0 self-start">
              <button
                disabled
                className="icon-tap-target p-2 rounded-full opacity-40 cursor-not-allowed"
                title="Notification preferences aren't available during beta"
              >
                <NotificationsIcon sx={{ fontSize: 18 }} />
              </button>
              <button onClick={handleShare} className="icon-tap-target p-2 hover:bg-neutral-100 rounded-full transition-colors" title="Share profile">
                <ShareIcon sx={{ fontSize: 18 }} />
              </button>
              <div className="relative">
                <button onClick={() => setShowMoreMenu(v => !v)} className="icon-tap-target p-2 hover:bg-neutral-100 rounded-full transition-colors">
                  <MoreHorizIcon sx={{ fontSize: 18 }} />
                </button>
                {showMoreMenu && dbProfile && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg py-2 w-44 z-10" onMouseLeave={() => setShowMoreMenu(false)}>
                    <ReportButton
                      contentType="creator_profile"
                      contentId={dbProfile.id}
                      label="Report creator"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {(dbProfile?.creator_risk_style || focusAreas.length > 0) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <RiskPill riskStyle={dbProfile?.creator_risk_style} />
              {focusAreas.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-sm text-[11px] font-medium">{tag}</span>
              ))}
            </div>
          )}

          {/* Buttons — desktop position (top of left rail) */}
          <div className="hidden md:flex flex-wrap items-center gap-2 pt-1">
            {renderActionButtons()}
          </div>
        </div>

        {/* Right column (desktop) / rest of the stack (mobile) */}
        <div className="flex-1 min-w-0 space-y-3 md:space-y-4">
          <AllocationBar raw={dbProfile?.portfolio_allocation} />

          <p className="text-sm leading-relaxed max-w-2xl">
            {creator.bio || <span className="text-neutral-400 italic">This creator hasn't added a bio yet.</span>}
          </p>

          <StatRow
            className="max-w-sm"
            stats={[
              { label: 'followers', value: followerCount !== null ? followerCount.toLocaleString() : creator.followers },
              { label: 'following', value: followingCount !== null ? followingCount.toLocaleString() : creator.following },
              { label: 'posts', value: postCount !== null ? postCount.toLocaleString() : creator.posts },
            ]}
          />

          {/* Buttons — mobile position (end of stack) */}
          <div className="flex flex-wrap md:hidden items-center gap-2">
            {renderActionButtons()}
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
          creatorUsername={dbProfile.username}
          creatorAvatarUrl={dbProfile.avatar_url}
          onClose={() => setShowChat(false)}
        />
      )}

      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-brand text-white px-6 py-4 rounded-md shadow-lg z-50 animate-slide-up pointer-events-none">
          <p className="font-bold">{toastMessage}</p>
        </div>
      )}
    </>
  );
}
