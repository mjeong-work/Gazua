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
import ReelInlineCommentsSheet from './ReelInlineCommentsSheet';
import ReelMoreMenu from './ReelMoreMenu';
import { useReelEngagement } from './useReelEngagement';
import { useSavedContent, type SavedContentInput } from '../../contexts/SavedContentContext';
import { formatCount } from './format';

/** Everything needed to render this item in My Profile's Saved tab — the context stamps on
 * userId/savedAt, everything else is denormalized at save time since the three surfaces that
 * render reels don't share a common, re-fetchable data source. */
type SavedItemMeta = Omit<SavedContentInput, 'userId'>;

interface ReelEngagementActionsProps {
  contentId: string;
  isLiked: boolean;
  likeCount: number;
  onToggleLike: () => void;
  /** Initial mock comment count — used as the fallback when contentDbId isn't real. */
  commentSeed: number;
  /** 'reel' (default) or 'video' — which content type this comment thread belongs to. */
  commentsContentType?: 'reel' | 'video';
  /** Real Supabase UUID for this reel/video, or null/undefined for mock-only content
   * (e.g. this preview modal has none — see the call site). */
  commentsContentDbId?: string | null;
  shareUrl: string;
  shareTitle: string;
  /** Ticker identified in the reel, if any — enables "Add to Watchlist" in the More menu. */
  ticker?: string | null;
  isTickerSaved?: boolean;
  onToggleTickerSave?: () => void;
  onToast?: (message: string, subtitle?: string) => void;
  /**
   * Desktop (lg+) target for the adjacent comments panel — a real flex sibling the parent
   * page renders next to the reel/video column, not an overlay. Only used in 'panel' mode.
   */
  commentsPortalTarget?: Element | null;
  /** False when this reel has scrolled out of view — auto-closes its comment panel. */
  isActive?: boolean;
  /** Fires whenever this reel's comment panel opens/closes (e.g. so the parent can lock page scroll in 'sheet' mode, or size the portal slot in 'panel' mode). */
  onCommentPanelOpenChange?: (open: boolean) => void;
  /**
   * 'panel' (default) — the dedicated Reel viewer's desktop side panel (portal into
   * commentsPortalTarget), mobile falls back to a viewport-level bottom sheet.
   * 'sheet' — the comments live entirely inside the Reel container itself at every
   * breakpoint: an absolutely-positioned sheet clipped to the reel's own bounds, never a
   * portal or a page-level overlay. Used by the Home Reels feed.
   */
  commentsDesktopMode?: 'panel' | 'sheet';
  /**
   * Positioning classes for the rail's own wrapper (e.g. "absolute right-3 bottom-24 z-20").
   * Applied internally rather than by the caller wrapping this component, so that in 'sheet'
   * mode the comments sheet — a sibling of the rail within this same Fragment — lands as a
   * direct child of the Reel container (the true position:relative ancestor) instead of being
   * nested inside the rail's own small positioned box.
   */
  railClassName: string;
  /** Denormalized data for the Save button — see SavedItemMeta. contentId (above) doubles as
   * this item's key in SavedContentContext, so both must be built from the same stable id. */
  savedItem: SavedItemMeta;
}

// The vertical Instagram-Reels-style action rail: Like, Comment, Save (primary — full size,
// full-opacity circles), More (secondary — smaller, dimmer). Share has no standalone rail
// icon; its actions (native share, copy link) live inside the More menu. Like and the
// ticker-Watchlist action are real (backed by props the parent already wires to
// Supabase/WatchlistContext) — bookmark is local/mock state, comments are real when
// commentsContentDbId is set (see useReelEngagement), and the two menus are local UI state.
export default function ReelEngagementActions({
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
  commentsPortalTarget,
  isActive = true,
  onCommentPanelOpenChange,
  commentsDesktopMode = 'panel',
  railClassName,
  savedItem,
}: ReelEngagementActionsProps) {
  const engagement = useReelEngagement({ contentType: commentsContentType, contentDbId: commentsContentDbId, commentSeed });
  const { isContentSaved, toggleSavedContent } = useSavedContent();
  const isSaved = isContentSaved(savedItem.contentId);

  // If this reel scrolls out of view while its comments are open, close them.
  useEffect(() => {
    if (!isActive && engagement.isCommentPanelOpen) engagement.closeCommentPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

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
      <div className={`flex flex-col gap-3 items-center lg:gap-4 ${railClassName}`}>
        <LikeButton isLiked={isLiked} likeCount={likeCount} onToggle={onToggleLike} variant="rail" />

        <ReelActionButton
          icon={<ChatBubbleOutlineIcon sx={{ fontSize: 22, color: '#ffffff' }} />}
          label="Comments"
          active={engagement.isCommentPanelOpen}
          activeBgClass="bg-white/30"
          onClick={() => (engagement.isCommentPanelOpen ? engagement.closeCommentPanel() : engagement.openCommentPanel())}
        >
          <span className="text-xs font-medium text-white">{formatCount(engagement.commentCount)}</span>
        </ReelActionButton>

        <SaveButton isSaved={isSaved} onToggle={() => toggleSavedContent(savedItem)} variant="rail" />

        <ReelActionButton
          icon={<MoreHorizIcon sx={{ fontSize: 20, color: '#ffffff' }} />}
          label="More options"
          size="sm"
          onClick={engagement.openMoreMenu}
        />
      </div>

      {commentsDesktopMode === 'sheet' ? (
        // Home Reels feed: comments live entirely inside the Reel container — this renders
        // as a direct sibling of the rail div above (both are children of whatever
        // position:relative Reel box the caller placed <ReelEngagementActions> inside),
        // so it's clipped to and sized relative to the Reel itself. No portal, no fixed
        // positioning, no page-level anything.
        <AnimatePresence>
          {engagement.isCommentPanelOpen && (
            <ReelInlineCommentsSheet
              comments={engagement.comments}
              commentCount={engagement.commentCount}
              onAddComment={engagement.addComment}
              onClose={engagement.closeCommentPanel}
            />
          )}
        </AnimatePresence>
      ) : (
        <>
          {/* Mobile bottom sheet — hides itself via CSS on lg+, but stays mounted so its
              Escape-to-close handler is active regardless of which layout is visible. */}
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

          {/* Desktop adjacent panel — portal-rendered into the flex slot the parent page owns. */}
          {commentsPortalTarget &&
            createPortal(
              <AnimatePresence>
                {engagement.isCommentPanelOpen && (
                  <ReelCommentsAdjacentPanel
                    comments={engagement.comments}
                    commentCount={engagement.commentCount}
                    onAddComment={engagement.addComment}
                    onClose={engagement.closeCommentPanel}
                    theme="dark"
                    className="w-full h-full"
                  />
                )}
              </AnimatePresence>,
              commentsPortalTarget,
            )}
        </>
      )}

      <AnimatePresence>
        {engagement.isMoreMenuOpen && (
          <ReelMoreMenu
            contentId={contentId}
            onClose={engagement.closeMoreMenu}
            onCopyLink={handleCopyLink}
            onNotInterested={() => { onToast?.("Not interested", "You'll see fewer reels like this"); engagement.closeMoreMenu(); }}
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
