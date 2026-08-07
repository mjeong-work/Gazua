import { useEffect, useMemo, useState } from 'react';
import { getCreator, type MockCreator } from '../data/creators';
import { getCreatorByUsername, getFollowerCount } from '../../lib/services/profiles.service';
import { getPostCountByCreator, getPostsByCreator } from '../../lib/services/posts.service';
import { getCommentCount } from '../../lib/services/comments.service';
import { getFollowingCount } from '../../lib/services/follows.service';
import { reportServiceError } from './useServiceQuery';
import type { Profile, PostWithCreator } from '../../types/database';

export interface DisplayPost {
  id: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  reposts: number;
  tag: string;
}

// Fallback content for the small MOCK_CREATORS set (no real posts.service data for them) —
// shared by both CreatorProfileInvestment and CreatorProfileVideos, which previously each had
// their own byte-for-byte copy of this array.
const MOCK_POSTS_FALLBACK: DisplayPost[] = [
  { id: 'mock-1', time: '2h ago', content: "Just added to my NVDA position. AI infrastructure spending isn't slowing down — data center capex from the hyperscalers is still accelerating. This is a multi-year theme, not a trade.", likes: 1240, comments: 87, reposts: 203, tag: '📈 Portfolio Update' },
  { id: 'mock-2', time: '1d ago', content: "Reminder: volatility is not risk. Risk is permanent loss of capital. A 20% drawdown in a fundamentally strong company is an opportunity, not a reason to panic sell. Zoom out.", likes: 3421, comments: 142, reposts: 891, tag: '💡 Investing Insight' },
  { id: 'mock-3', time: '3d ago', content: "Fed held rates steady again. My read: we're in a higher-for-longer environment through at least Q3. Positioning accordingly — overweight value, underweight long-duration growth. Cash is still earning 5%+, don't sleep on it.", likes: 2108, comments: 219, reposts: 445, tag: '🏦 Macro Watch' },
  { id: 'mock-4', time: '5d ago', content: "Q1 earnings recap: beat on revenue, missed on margins. Management guided conservatively for Q2 which I think is sandbagging. Holding my position. Full breakdown in my latest video — link in bio.", likes: 987, comments: 63, reposts: 134, tag: '📊 Earnings' },
  { id: 'mock-5', time: '1w ago', content: "New to investing? The single best thing you can do this year: set up automatic contributions to a low-cost index fund and stop watching the daily price. Time in market beats timing the market — every time.", likes: 5832, comments: 314, reposts: 2109, tag: '🎓 Beginner Tips' },
];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1d ago' : `${d}d ago`;
}

async function normalizeDbPost(p: PostWithCreator): Promise<DisplayPost> {
  const { data: commentCount } = await getCommentCount(p.id);
  return {
    id: p.id,
    time: formatRelativeTime(p.created_at),
    content: p.content,
    likes: p.like_count,
    comments: commentCount ?? 0,
    reposts: p.share_count,
    tag: p.category,
  };
}

/**
 * Shared fetch + derived-state logic for the two public Creator Profile pages
 * (CreatorProfileInvestment / CreatorProfileVideos) — both loaded the same profile, follower/
 * following/post counts, and posts list independently before this extraction. Each page still
 * owns its own tab-specific data (videos, portfolio allocation) on top of this.
 */
export function useCreatorProfileData(creatorId: string) {
  const mockCreator = getCreator(creatorId);

  const [dbProfile, setDbProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [dbPosts, setDbPosts] = useState<DisplayPost[] | null>(null);

  useEffect(() => {
    setProfileLoading(true);
    getCreatorByUsername(creatorId).then(({ data, error }) => {
      setDbProfile(data);
      setProfileLoading(false);
      if (error) {
        // Doesn't distinguish "genuinely no such creator" from a failed request
        // (getCreatorByUsername returns the same shape either way), so this can retry-and-
        // still-404 — that's fine, the "Creator not found" fallback covers it either way.
        reportServiceError(error, { label: 'this creator profile', retry: () => setProfileRefreshKey(k => k + 1) });
      }
      if (data) {
        getFollowerCount(data.id).then(({ data: n }) => { if (n !== null) setFollowerCount(n); });
        getFollowingCount(data.id).then(({ data: n }) => { if (n !== null) setFollowingCount(n); });
        getPostCountByCreator(data.id).then(({ data: n }) => { if (n !== null) setPostCount(n); });
        getPostsByCreator(data.id).then(({ data: posts, error: postsError }) => {
          if (postsError) {
            reportServiceError(postsError, { label: `${data.full_name}'s posts` });
            return;
          }
          if (!posts) return;
          Promise.all(posts.map(normalizeDbPost)).then(setDbPosts);
        });
      }
    });
  }, [creatorId, profileRefreshKey]);

  const posts = dbProfile ? (dbPosts ?? []) : MOCK_POSTS_FALLBACK;

  // Prefer DB data; keep mock values for counts not yet in DB.
  const creator = useMemo((): MockCreator | null => {
    if (dbProfile) {
      return {
        id: dbProfile.username,
        name: dbProfile.full_name,
        handle: dbProfile.handle ? `@${dbProfile.handle}` : `@${dbProfile.username}`,
        avatar: mockCreator?.avatar ?? (dbProfile.full_name?.[0] ?? '?').toUpperCase(),
        bio: dbProfile.bio ?? mockCreator?.bio ?? '',
        // The "verified" badge is credibility_level === 'verified_pro' only (decision 1) — not
        // is_verified, which is an internal due-diligence flag, not a badge trigger.
        verified: dbProfile.credibility_level === 'verified_pro',
        credibilityLevel: dbProfile.credibility_level,
        followers: mockCreator?.followers ?? '—',
        following: mockCreator?.following ?? '—',
        posts: mockCreator?.posts ?? '—',
        focus: dbProfile.focus ?? mockCreator?.focus ?? '',
      };
    }
    return mockCreator;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbProfile]);

  return { dbProfile, profileLoading, followerCount, followingCount, postCount, posts, creator };
}
