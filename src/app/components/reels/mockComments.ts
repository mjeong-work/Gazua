import type { ReelCommentItem } from './types';

const SEED_POOL: Omit<ReelCommentItem, 'id' | 'createdAt'>[] = [
  { authorName: 'Jordan Lee', authorHandle: '@jordanl', avatar: '🧑', content: 'Great breakdown, this is exactly the kind of analysis I look for.' },
  { authorName: 'Priya Shah', authorHandle: '@priyash', avatar: '👩', content: 'Appreciate the transparency on the position sizing here.' },
  { authorName: 'Marcus Webb', authorHandle: '@marcusw', avatar: '👨', content: "Curious how this holds up if rates move the other way." },
];

/**
 * Frontend-only seed comments, used when a reel/video has no real Supabase id (mock-only
 * content, or a fetch error) — otherwise a nonzero mock comment count would render an empty
 * panel. Capped at 3 regardless of the displayed count (some mock reels show hundreds of
 * "comments").
 */
export function generateMockComments(seedCount: number): ReelCommentItem[] {
  if (seedCount <= 0) return [];
  const now = Date.now();
  return SEED_POOL.slice(0, Math.min(3, SEED_POOL.length)).map((c, i) => ({
    ...c,
    id: `mock-${i}`,
    createdAt: new Date(now - (i + 1) * 45 * 60_000).toISOString(),
  }));
}
