import { motion } from 'motion/react';
import CloseIcon from '@mui/icons-material/Close';
import CommentBody, { type CommentTheme } from './CommentBody';
import type { ReelCommentItem } from './types';

interface ReelCommentsAdjacentPanelProps {
  comments: ReelCommentItem[];
  commentCount: number;
  onAddComment: (text: string) => void;
  onClose: () => void;
  theme?: CommentTheme;
  /** Sizing/height — the parent (portal target) owns layout position, this owns its own box. */
  className?: string;
}

// Desktop-only. Deliberately NOT position:fixed/absolute — this is meant to be rendered (via
// a React Portal) into a real flex sibling the parent page provides alongside the reel/video
// column, so it participates in normal layout instead of floating over the content. Escape-to-
// close is handled by the always-mounted mobile ReelCommentPanel (its useEscapeKey hook stays
// active regardless of which breakpoint is visually showing), so this doesn't duplicate it.
export default function ReelCommentsAdjacentPanel({
  comments,
  commentCount,
  onAddComment,
  onClose,
  theme = 'dark',
  className = '',
}: ReelCommentsAdjacentPanelProps) {
  const dark = theme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex flex-col rounded-2xl border overflow-hidden ${
        dark ? 'bg-neutral-900/95 backdrop-blur-md border-white/10 text-white' : 'bg-white border-gray-200'
      } ${className}`}
      role="region"
      aria-label="Comments"
    >
      <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${dark ? 'border-white/10' : 'border-gray-100'}`}>
        <h2 className="text-base font-bold">Comments</h2>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${dark ? 'text-white/40' : 'text-gray-400'}`}>{commentCount}</span>
          <button
            onClick={onClose}
            aria-label="Close comments"
            className={`p-1 rounded-full transition-colors ${dark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>
      <CommentBody theme={theme} comments={comments} onAddComment={onAddComment} />
    </motion.div>
  );
}
