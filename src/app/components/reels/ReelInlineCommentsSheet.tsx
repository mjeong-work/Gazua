import { motion } from 'motion/react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useDragToDismissSheet } from '../../hooks/useDragToDismissSheet';
import CommentBody from './CommentBody';
import type { ReelCommentItem } from './types';

interface ReelInlineCommentsSheetProps {
  comments: ReelCommentItem[];
  commentCount: number;
  onAddComment: (text: string) => void;
  onClose: () => void;
}

// The Home Reels feed's comments sheet — deliberately NOT position:fixed and NOT portaled
// anywhere. It's an absolutely-positioned child of the reel card itself (which is
// position:relative and overflow-hidden), so the reel is its containing block: the sheet is
// clipped at the reel's own edges, sized as a percentage of the reel's height (not the
// viewport's), and never touches page-level layout or scroll. The Reel stays the "app" the
// sheet lives inside, per Instagram's own reel-comments behavior.
export default function ReelInlineCommentsSheet({ comments, commentCount, onAddComment, onClose }: ReelInlineCommentsSheetProps) {
  useEscapeKey(onClose);
  const { dragControls, handleDragEnd, handlePointerDownOnHandle, listPointerHandlers } =
    useDragToDismissSheet({ onDismiss: onClose, distanceThreshold: 80 });

  return (
    <div className="absolute inset-0 z-30" role="dialog" aria-modal="true" aria-label="Comments">
      {/* Dims only the visible top portion of the reel (the sheet itself covers the rest). */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="absolute inset-x-0 bottom-0 h-[72%] rounded-t-2xl bg-white shadow-2xl flex flex-col touch-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onPointerDown={handlePointerDownOnHandle}
          className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold">Comments</h2>
          <span className="text-sm text-gray-400 font-medium">{commentCount}</span>
        </div>
        {/* Only this list scrolls — the reel/page behind never does. */}
        <div className="flex-1 flex flex-col min-h-0 touch-auto">
          <CommentBody theme="light" comments={comments} onAddComment={onAddComment} listPointerHandlers={listPointerHandlers} />
        </div>
      </motion.div>
    </div>
  );
}
