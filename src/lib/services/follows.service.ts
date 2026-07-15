import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { Profile } from '../../types/database'

const CREATOR_SNIPPET = `
  id, username, handle, full_name, avatar_url,
  bio, focus, tagline, tags, is_verified, is_creator,
  featured_category, subscription_tier
` as const

// ── followCreator ────────────────────────────────────────────────
/**
 * Follow a creator. RLS enforces that follower_id = auth.uid().
 * Idempotent — PK prevents duplicate follows.
 */
export async function followCreator(
  followerId: string,
  creatorId: string
): Promise<ServiceResult<void>> {
  if (followerId === creatorId) {
    return { data: null, error: 'You cannot follow yourself.' }
  }

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, creator_id: creatorId })

  if (error?.code === '23505') return { data: null, error: null } // already following
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── unfollowCreator ──────────────────────────────────────────────
/**
 * Unfollow a creator.
 * RLS enforces that only the follower can delete their own follow row.
 */
export async function unfollowCreator(
  followerId: string,
  creatorId: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('creator_id', creatorId)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── isFollowing ──────────────────────────────────────────────────
/**
 * Check whether a user currently follows a creator.
 * Used to initialize Follow button state on profile pages.
 */
export async function isFollowing(
  followerId: string,
  creatorId: string
): Promise<ServiceResult<boolean>> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', followerId)
    .eq('creator_id', creatorId)

  if (error) return { data: null, error: error.message }
  return { data: (count ?? 0) > 0, error: null }
}

// ── getFollowedCreatorIds ────────────────────────────────────────
/**
 * Returns the list of creator UUIDs that a user follows.
 * Lightweight — IDs only. Used for feed filtering and batch state checks.
 */
export async function getFollowedCreatorIds(
  userId: string
): Promise<ServiceResult<string[]>> {
  const { data, error } = await supabase
    .from('follows')
    .select('creator_id')
    .eq('follower_id', userId)

  if (error) return { data: null, error: error.message }
  return { data: (data ?? []).map(row => row.creator_id), error: null }
}

// ── getFollowedCreators ──────────────────────────────────────────
/**
 * Returns full creator profiles for everyone a user follows.
 * Used by the Following tab in the main feed and the Following tab in reels.
 */
export async function getFollowedCreators(
  userId: string
): Promise<ServiceResult<Profile[]>> {
  const { data: followRows, error: followError } = await supabase
    .from('follows')
    .select('creator_id')
    .eq('follower_id', userId)

  if (followError) return { data: null, error: followError.message }
  if (!followRows || followRows.length === 0) return { data: [], error: null }

  const creatorIds = followRows.map(row => row.creator_id)

  const { data, error } = await supabase
    .from('profiles')
    .select(CREATOR_SNIPPET)
    .in('id', creatorIds)

  if (error) return { data: null, error: error.message }
  return { data: data as Profile[], error: null }
}

// ── getFollowerCount ─────────────────────────────────────────────
/** Total number of followers for a creator. Used on profile pages. */
export async function getFollowerCount(
  creatorId: string
): Promise<ServiceResult<number>> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)

  if (error) return { data: null, error: error.message }
  return { data: count ?? 0, error: null }
}

// ── getFollowingCount ────────────────────────────────────────────
/** Number of creators a user follows. Used on profile pages. */
export async function getFollowingCount(
  userId: string
): Promise<ServiceResult<number>> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId)

  if (error) return { data: null, error: error.message }
  return { data: count ?? 0, error: null }
}

// ── getFollowerCounts ────────────────────────────────────────────
/** Follower counts for a batch of creators in one query. Used by creator directory/list
 * views that need to show a real count per card without N+1 queries. */
export async function getFollowerCounts(
  creatorIds: string[]
): Promise<ServiceResult<Record<string, number>>> {
  if (!creatorIds.length) return { data: {}, error: null }

  const { data, error } = await supabase
    .from('follows')
    .select('creator_id')
    .in('creator_id', creatorIds)

  if (error) return { data: null, error: error.message }

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.creator_id] = (counts[row.creator_id] ?? 0) + 1
  }
  return { data: counts, error: null }
}
