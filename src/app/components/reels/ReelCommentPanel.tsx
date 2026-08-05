import { motion } from 'motion/react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useDragToDismissSheet } from '../../hooks/useDragToDismissSheet';
import CommentBody from './CommentBody';
import type { ReelCommentItem } from './types';

interface ReelCommentPanelProps {
  comments: ReelCommentItem[];
  commentCount: number;
  onAddComment: (text: string) => void;
  onClose: () => void;
}

// Mobile-only viewport-level bottom sheet — a real draggable sheet (drag the handle down, drag
// down from the top of the comment list, or fling either, to dismiss; spring physics via
// motion's drag gesture — see useDragToDismissSheet). Used by 'panel' mode as the small-screen
// fallback for the dedicated Reel viewer's desktop side panel (ReelCommentsAdjacentPanel). The
// Home Reels feed uses ReelInlineCommentsSheet instead, which is scoped to the Reel container
// itself rather than the viewport, at every breakpoint.
export default function ReelCommentPanel({ comments, commentCount, onAddComment, onClose }: ReelCommentPanelProps) {
  useEscapeKey(onClose);
  const { dragControls, handleDragEnd, handlePointerDownOnHandle, listPointerHandlers } =
    useDragToDismissSheet({ onDismiss: onClose });

  return (
    <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Comments">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={handleDragEnd}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 h-[72vh] rounded-t-2xl bg-white shadow-2xl flex flex-col touch-none"
      >
        <div
          onPointerDown={handlePointerDownOnHandle}
          className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1.5 bg-neutral-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-neutral-100 flex-shrink-0">
          <h2 className="text-base font-bold">Comments</h2>
          <span className="text-sm text-neutral-400 font-medium">{commentCount}</span>
        </div>
        <div className="flex-1 flex flex-col min-h-0 touch-auto">
          <CommentBody theme="light" comments={comments} onAddComment={onAddComment} listPointerHandlers={listPointerHandlers} />
        </div>
      </motion.div>
    </div>
  );
}
