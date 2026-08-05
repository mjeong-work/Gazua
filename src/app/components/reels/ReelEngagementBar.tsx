import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton';
import ReelActionButton from './ReelActionButton';
import ReelCommentPanel from './ReelCommentPanel';
import ReelCommentsAdjacentPanel from './ReelCommentsAdjacentPanel';
import ReelMoreMenu from './ReelMoreMenu';
import { useReelEngagement } from './useReelEngagement';
import { useSavedContent, type SavedContentInput } from '../../contexts/SavedContentContext';
import { formatCount } from './format';

type SavedItemMeta = Omit<SavedContentInput, 'userId'>;

interface ReelEngagementBarProps {
  contentId: string;
  isLiked: boolean;
  likeCount: number;
  onToggleLike: () => void;
  commentSeed: number;
  /** 'reel' (default) or 'video' — which content type this comment thread belongs to. */
  commentsContentType?: 'reel' | 'video';
  /** Real Supabase UUID for this reel/video, or null/undefined for mock-only content. */
  commentsContentDbId?: string | null;
  shareUrl: string;
  shareTitle: string;
  ticker?: string | null;
  isTickerSaved?: boolean;
  onToggleTickerSave?: () => void;
  onToast?: (message: string, subtitle?: string) => void;
  className?: string;
  /** Desktop (lg+) target for the adjacent comments panel — see ReelEngagementActions. */
  commentsPortalTarget?: Element | null;
  /** Lets the parent size the portal slot (collapsed when closed, sized when open). */
  onCommentPanelOpenChange?: (open: boolean) => void;
  /** Denormalized data for the Save button — see ReelEngagementActions' SavedItemMeta. */
  savedItem: SavedItemMeta;
}

// Horizontal counterpart to ReelEngagementActions, for non-immersive video layouts (the
// video watch page) where a vertical dark-circle rail overlaid on the player would look out
// of place on a plain white page. Same shared atoms/overlays/hook — only the layout differs.
// Share has no standalone button here either; its actions live inside the More menu.
export default function ReelEngagementBar({
  contentId,
  isLiked,
  likeCount,
  onToggleLike,
  commentSeed,
  commentsContentType = 'reel',
  commentsContentDbId,
  shareUrl,
  shareTitle,
  ticker,
  isTickerSaved,
  onToggleTickerSave,
  onToast,
  className = '',
  commentsPortalTarget,
  onCommentPanelOpenChange,
  savedItem,
}: ReelEngagementBarProps) {
  const engagement = useReelEngagement({ contentType: commentsContentType, contentDbId: commentsContentDbId, commentSeed });
  const { isContentSaved, toggleSavedContent } = useSavedContent();
  const isSaved = isContentSaved(savedItem.contentId);

  useEffect(() => {
    onCommentPanelOpenChange?.(engagement.isCommentPanelOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagement.isCommentPanelOpen]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      onToast?.('Link copied');
    } catch {
      onToast?.('Could not copy link');
    }
    engagement.closeMoreMenu();
  };

  return (
    <>
      <div className={`flex items-center gap-5 ${className}`}>
        <LikeButton isLiked={isLiked} likeCount={likeCount} onToggle={onToggleLike} variant="bar" />

        <ReelActionButton
          icon={<ChatBubbleOutlineIcon sx={{ fontSize: 20, color: '#374151' }} />}
          label="Comments"
          onClick={() => (engagement.isCommentPanelOpen ? engagement.closeCommentPanel() : engagement.openCommentPanel())}
          variant="bar"
        >
          <span className="text-sm font-medium text-neutral-700">{formatCount(engagement.commentCount)}</span>
        </ReelActionButton>

        <SaveButton isSaved={isSaved} onToggle={() => toggleSavedContent(savedItem)} variant="bar" />

        <ReelActionButton
          icon={<MoreHorizIcon sx={{ fontSize: 20, color: '#374151' }} />}
          label="More options"
          onClick={engagement.openMoreMenu}
          variant="bar"
          className="ml-auto"
        />
      </div>

      <AnimatePresence>
        {engagement.isCommentPanelOpen && (
          <ReelCommentPanel
            comments={engagement.comments}
            commentCount={engagement.commentCount}
            onAddComment={engagement.addComment}
            onClose={engagement.closeCommentPanel}
          />
        )}
      </AnimatePresence>

      {commentsPortalTarget &&
        createPortal(
          <AnimatePresence>
            {engagement.isCommentPanelOpen && (
              <ReelCommentsAdjacentPanel
                comments={engagement.comments}
                commentCount={engagement.commentCount}
                onAddComment={engagement.addComment}
                onClose={engagement.closeCommentPanel}
                theme="light"
                className="w-full h-full"
              />
            )}
          </AnimatePresence>,
          commentsPortalTarget,
        )}

      <AnimatePresence>
        {engagement.isMoreMenuOpen && (
          <ReelMoreMenu
            contentId={contentId}
            onClose={engagement.closeMoreMenu}
            onCopyLink={handleCopyLink}
            onNotInterested={() => { onToast?.("Not interested", "You'll see fewer videos like this"); engagement.closeMoreMenu(); }}
            shareUrl={shareUrl}
            shareTitle={shareTitle}
            ticker={ticker}
            isTickerSaved={isTickerSaved}
            onToggleTickerSave={onToggleTickerSave}
          />
        )}
      </AnimatePresence>
    </>
  );
}
