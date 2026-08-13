import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuth } from '../contexts/AuthContext';
import { useDragToDismissSheet } from '../hooks/useDragToDismissSheet';
import { useServiceQuery } from '../hooks/useServiceQuery';
import { getComments, addComment, deleteComment, type CommentWithAuthor } from '../../lib/services/comments.service';

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function InitialsAvatar({ name, size = 8 }: { name: string; size?: number }) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  const colors = [
    'bg-emerald-100 text-emerald-700',
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
  ];
  const color = colors[initial.charCodeAt(0) % colors.length];
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center text-sm font-bold flex-shrink-0`}>
      {initial}
    </div>
  );
}

interface CommentPanelProps {
  postId: string;
  postTitle: string;
  initialCount: number;
  onClose: () => void;
  onCountChange: (newCount: number) => void;
}

export default function CommentPanel({
  postId,
  postTitle,
  initialCount,
  onClose,
  onCountChange,
}: CommentPanelProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Trigger entrance animation after mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { data: commentsData, loading } = useServiceQuery(
    () => getComments(postId),
    [postId],
    { enabled: !!postId, label: 'comments' },
  );
  useEffect(() => { if (commentsData) setComments(commentsData); }, [commentsData]);

  const count = comments.length || initialCount;

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300);
  };

  const { dragControls, handleDragEnd, handlePointerDownOnHandle, listPointerHandlers } =
    useDragToDismissSheet({ onDismiss: handleClose });

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || !profile || submitting) return;

    if (!postId) {
      setError('Comments are only available on published posts.');
      return;
    }

    const optimistic: CommentWithAuthor = {
      id: `optimistic-${Date.now()}`,
      post_id: postId,
      user_id: user.id,
      content: trimmed,
      created_at: new Date().toISOString(),
      author: { full_name: profile.full_name, username: profile.username },
    };

    setComments(prev => [...prev, optimistic]);
    onCountChange(comments.length + 1);
    setText('');
    setSubmitting(true);
    setError(null);

    const { data, error: err } = await addComment(postId, user.id, trimmed);
    setSubmitting(false);

    if (err || !data) {
      console.error('[addComment]', err);
      setComments(prev => prev.filter(c => c.id !== optimistic.id));
      onCountChange(comments.length);
      setError(err ?? 'Failed to post comment. Please try again.');
      setText(trimmed);
      return;
    }

    setComments(prev => prev.map(c => (c.id === optimistic.id ? data : c)));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleDelete = async (commentId: string) => {
    const removed = comments.find(c => c.id === commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
    onCountChange(Math.max(0, comments.length - 1));

    const { error: err } = await deleteComment(commentId);
    if (err && removed) {
      setComments(prev =>
        [...prev, removed].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      );
      onCountChange(comments.length);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Bottom sheet — draggable via the handle or by pulling down on the list once it's
          scrolled to the top (see useDragToDismissSheet). `show` (not AnimatePresence) drives
          open/close since the call site conditionally mounts this with a plain `&&`. */}
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={handleDragEnd}
        animate={{ y: show ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 h-[75vh] bg-white rounded-t-md shadow-2xl flex flex-col touch-none lg:mx-auto lg:bottom-6 lg:w-[440px] lg:max-w-[92vw] lg:h-[70vh] lg:rounded-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          onPointerDown={handlePointerDownOnHandle}
          className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1.5 bg-neutral-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 flex-shrink-0">
          <h2 className="text-base font-bold">Comments</h2>
          <span className="text-sm text-neutral-400 font-medium">{count}</span>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 touch-auto" {...listPointerHandlers}>
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(n => (
                <div key={n} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-neutral-200 rounded w-1/4" />
                    <div className="h-3 bg-neutral-200 rounded w-3/4" />
                    <div className="h-3 bg-neutral-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && comments.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-neutral-500 font-medium text-sm">No comments yet</p>
              <p className="text-neutral-400 text-xs mt-1">Be the first to share your thoughts</p>
            </div>
          )}

          {!loading && comments.map(comment => (
            <div key={comment.id} className="flex gap-3 group">
              <InitialsAvatar name={comment.author.full_name} size={8} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-bold leading-tight">{comment.author.full_name}</span>
                  <span className="text-xs text-neutral-400">@{comment.author.username}</span>
                  <span className="text-xs text-neutral-400">· {formatRelative(comment.created_at)}</span>
                </div>
                <p className="text-sm mt-1 leading-relaxed break-words">{comment.content}</p>
              </div>
              {user?.id === comment.user_id && !comment.id.startsWith('optimistic-') && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-red-500 flex-shrink-0 self-start mt-0.5"
                  aria-label="Delete comment"
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </button>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-neutral-100 px-5 py-4">
          {!postId ? (
            <p className="text-center text-sm text-neutral-400 py-2">Comments available on published posts</p>
          ) : !user ? (
            <p className="text-center text-sm text-neutral-500 py-2">Sign in to leave a comment</p>
          ) : (
            <>
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Add a comment…"
                  value={text}
                  onChange={e => setText(e.target.value.slice(0, 500))}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                  disabled={submitting}
                  className="flex-1 px-3 py-1.5 border border-neutral-200 rounded-sm text-sm focus:outline-none focus:border-brand transition-colors disabled:opacity-50 bg-neutral-50"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || submitting}
                  aria-label="Post comment"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-brand text-white hover:bg-brand-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <SendIcon sx={{ fontSize: 16 }} />
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
