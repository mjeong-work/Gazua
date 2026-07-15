/** A single reel/video comment — either a real `reel_comments` row (normalized) or a
 * local mock/optimistic entry when the content has no backing DB id yet. */
export interface ReelCommentItem {
  id: string;
  authorName: string;
  authorHandle: string;
  avatar: string;
  content: string;
  createdAt: string; // ISO timestamp
}
