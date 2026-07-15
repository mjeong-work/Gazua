import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isUUID } from '../../contexts/FollowContext';
import { generateMockComments } from './mockComments';
import type { ReelCommentItem } from './types';
import {
  getReelComments,
  getReelCommentCount,
  addReelComment,
  type ReelCommentContentType,
  type ReelCommentWithAuthor,
} from '../../../lib/services/reelComments.service';

interface UseReelEngagementOptions {
  contentType: ReelCommentContentType;
  /** Real Supabase UUID for this reel/video, or null/undefined for mock-only content. */
  contentDbId?: string | null;
  /** Initial mock comment count — used as the fallback when contentDbId isn't real. */
  commentSeed: number;
}

function normalizeComment(c: ReelCommentWithAuthor): ReelCommentItem {
  return {
    id: c.id,
    authorName: c.author.full_name,
    authorHandle: `@${c.author.username}`,
    avatar: (c.author.full_name?.[0] ?? '?').toUpperCase(),
    content: c.content,
    createdAt: c.created_at,
  };
}

/**
 * Comment/overlay state shared by ReelEngagementActions (vertical rail, Reels feed) and
 * ReelEngagementBar (horizontal bar, video watch page). Backed by the real `reel_comments`
 * table when contentDbId is a Supabase UUID; falls back to the local mock generator otherwise
 * (mock-only content, e.g. the CreatorsPage reel preview modal, or a fetch error). Like (real,
 * Supabase-backed) and Save (real, backed by SavedContentContext) are NOT part of this hook —
 * callers manage them via props/context directly. Share has no standalone state; it lives
 * entirely inside the More menu.
 */
export function useReelEngagement({ contentType, contentDbId, commentSeed }: UseReelEngagementOptions) {
  const { user, profile } = useAuth();
  const isReal = !!contentDbId && isUUID(contentDbId);

  const [comments, setComments] = useState<ReelCommentItem[]>(() => (isReal ? [] : generateMockComments(commentSeed)));
  const [commentCount, setCommentCount] = useState(isReal ? commentSeed : commentSeed);
  const [commentsLoaded, setCommentsLoaded] = useState(!isReal);

  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Eagerly fetch the real count (cheap head-count query) so the rail badge is accurate
  // without paying for the full comment list until the panel actually opens.
  useEffect(() => {
    if (!isReal) return;
    let cancelled = false;
    getReelCommentCount(contentType, contentDbId!).then(({ data, error }) => {
      if (cancelled || error || data === null) return; // leave the mock-seed fallback in place
      setCommentCount(data);
    });
    return () => { cancelled = true; };
  }, [isReal, contentType, contentDbId]);

  // Lazily fetch the full comment list the first time the panel opens.
  useEffect(() => {
    if (!isReal || !isCommentPanelOpen || commentsLoaded) return;
    let cancelled = false;
    getReelComments(contentType, contentDbId!).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        // Query failed (e.g. table not migrated yet) — fall back to mock seed comments
        // rather than showing a real content item as permanently commentless.
        setComments(generateMockComments(commentSeed));
        setCommentsLoaded(true);
        return;
      }
      setComments(data.map(normalizeComment));
      setCommentCount(data.length);
      setCommentsLoaded(true);
    });
    return () => { cancelled = true; };
  }, [isReal, isCommentPanelOpen, commentsLoaded, contentType, contentDbId, commentSeed]);

  const addComment = (text: string) => {
    if (isReal && user) {
      const pendingId = `pending-${Date.now()}`;
      const optimistic: ReelCommentItem = {
        id: pendingId,
        authorName: profile?.full_name ?? 'You',
        authorHandle: profile?.username ? `@${profile.username}` : '@you',
        avatar: (profile?.full_name?.[0] ?? '🙂').toUpperCase(),
        content: text,
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => [...prev, optimistic]);
      setCommentCount((prev) => prev + 1);

      addReelComment(contentType, contentDbId!, user.id, text).then(({ data, error }) => {
        if (error || !data) {
          // Roll back the optimistic comment on failure.
          setComments((prev) => prev.filter((c) => c.id !== pendingId));
          setCommentCount((prev) => Math.max(0, prev - 1));
          return;
        }
        setComments((prev) => prev.map((c) => (c.id === pendingId ? normalizeComment(data) : c)));
      });
      return;
    }

    // Mock fallback — local-only, matches previous useMockReelEngagement behavior.
    const newComment: ReelCommentItem = {
      id: `local-${Date.now()}`,
      authorName: profile?.full_name ?? 'You',
      authorHandle: profile?.username ? `@${profile.username}` : '@you',
      avatar: '🙂',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, newComment]);
    setCommentCount((prev) => prev + 1);
  };

  return {
    comments,
    commentCount,
    addComment,
    isCommentPanelOpen,
    openCommentPanel: () => setIsCommentPanelOpen(true),
    closeCommentPanel: () => setIsCommentPanelOpen(false),
    isMoreMenuOpen,
    openMoreMenu: () => setIsMoreMenuOpen(true),
    closeMoreMenu: () => setIsMoreMenuOpen(false),
  };
}
