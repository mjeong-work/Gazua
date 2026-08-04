import { useRef, useState } from 'react';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '../../contexts/AuthContext';
import type { ReelCommentItem } from './types';

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export type CommentTheme = 'light' | 'dark';

interface CommentBodyProps {
  theme: CommentTheme;
  comments: ReelCommentItem[];
  onAddComment: (text: string) => void;
  /** Pointer handlers from useDragToDismissSheet — when provided, pulling down on this list
   *  while it's scrolled to the top hands off to the sheet's drag-to-dismiss gesture. Omitted
   *  by the desktop adjacent panel, which isn't a dismissible sheet. */
  listPointerHandlers?: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
}

// Shared scrollable list + sticky input, reused by the mobile bottom sheet
// (ReelCommentPanel) and the desktop adjacent panel (ReelCommentsAdjacentPanel).
export default function CommentBody({ theme, comments, onAddComment, listPointerHandlers }: CommentBodyProps) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const dark = theme === 'dark';

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddComment(trimmed);
    setText('');
    // Scroll only this list's own scrollTop — never Element.scrollIntoView(), which walks
    // every scrollable ancestor (including the reel feed's snap-scroll container) and can
    // knock it out of alignment with its snap points.
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  return (
    <>
      <div
        ref={listRef}
        className={`flex-1 overflow-y-auto px-5 py-4 space-y-5 ${dark ? 'text-white' : ''}`}
        {...listPointerHandlers}
      >
        {comments.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${dark ? 'bg-white/10' : 'bg-gray-100'}`}>
              <svg className={`w-8 h-8 ${dark ? 'text-white/40' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className={`font-medium text-sm ${dark ? 'text-white/70' : 'text-gray-500'}`}>No comments yet</p>
            <p className={`text-xs mt-1 ${dark ? 'text-white/40' : 'text-gray-400'}`}>Be the first to share your thoughts</p>
          </div>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 ${dark ? 'bg-white/10' : 'bg-gray-100'}`}>
              {comment.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-bold leading-tight">{comment.authorName}</span>
                <span className={`text-xs ${dark ? 'text-white/40' : 'text-gray-400'}`}>{comment.authorHandle}</span>
                <span className={`text-xs ${dark ? 'text-white/40' : 'text-gray-400'}`}>· {formatRelative(comment.createdAt)}</span>
              </div>
              <p className="text-sm mt-1 leading-relaxed break-words">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={`flex-shrink-0 border-t px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${dark ? 'border-white/10' : 'border-gray-100'}`}>
        {!user ? (
          <p className={`text-center text-sm py-2 ${dark ? 'text-white/50' : 'text-gray-500'}`}>Sign in to leave a comment</p>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="flex gap-2 items-center"
          >
            <input
              type="text"
              placeholder="Add a comment…"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              className={`flex-1 px-3 py-1.5 border rounded-full text-sm focus:outline-none focus:border-brand transition-colors ${
                dark ? 'bg-white/10 border-white/20 text-white placeholder:text-white/40' : 'bg-gray-50 border-gray-200'
              }`}
            />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Post comment"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-brand text-white hover:bg-brand-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <SendIcon sx={{ fontSize: 16 }} />
            </button>
          </form>
        )}
      </div>
    </>
  );
}
