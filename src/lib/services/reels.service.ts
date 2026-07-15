import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { Reel, ReelInsert, ReelWithCreator, VideoWithCreator } from '../../types/database'

// ── Select fragments ─────────────────────────────────────────────
const REEL_WITH_CREATOR = `
  *,
  creator:profiles!creator_id (
    id, username, handle, full_name, avatar_url, is_verified
  )
` as const

const REEL_WITH_CREATOR_AND_LIKES = `
  ${REEL_WITH_CREATOR},
  reel_likes(count)
` as const

const VIDEO_WITH_CREATOR = `
  *,
  creator:profiles!creator_id (
    id, username, full_name, avatar_url, is_verified
  )
` as const

// ── Internal normalizer ──────────────────────────────────────────
type RawReelRow = Reel & {
  creator: ReelWithCreator['creator']
  reel_likes: Array<{ count: number }>
}

function normalizeReel(row: RawReelRow): ReelWithCreator {
  const { reel_likes, ...rest } = row
  return {
    ...rest,
    like_count: reel_likes?.[0]?.count ?? 0,
  }
}

// ── getReels ─────────────────────────────────────────────────────
/**
 * Fetch reels for the main feed.
 * Results include creator info and like count.
 */
export async function getReels(options?: {
  limit?: number
  offset?: number
}): Promise<ServiceResult<ReelWithCreator[]>> {
  const { data, error } = await supabase
    .from('reels')
    .select(REEL_WITH_CREATOR_AND_LIKES)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 20)

  if (error) return { data: null, error: error.message }
  return {
    data: (data as unknown as RawReelRow[]).map(normalizeReel),
    error: null,
  }
}

// ── getReelsByCreator ────────────────────────────────────────────
/** All reels by a specific creator. Used on creator profile pages. */
export async function getReelsByCreator(
  creatorId: string,
  limit = 20
): Promise<ServiceResult<ReelWithCreator[]>> {
  const { data, error } = await supabase
    .from('reels')
    .select(REEL_WITH_CREATOR_AND_LIKES)
    .eq('creator_id', creatorId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return {
    data: (data as unknown as RawReelRow[]).map(normalizeReel),
    error: null,
  }
}

// ── getReelsByCreatorIds ─────────────────────────────────────────
/**
 * Fetch reels from a list of creator UUIDs.
 * Used to populate the "Following" reels tab.
 */
export async function getReelsByCreatorIds(
  creatorIds: string[],
  limit = 20
): Promise<ServiceResult<ReelWithCreator[]>> {
  if (!creatorIds.length) return { data: [], error: null }

  const { data, error } = await supabase
    .from('reels')
    .select(REEL_WITH_CREATOR_AND_LIKES)
    .in('creator_id', creatorIds)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return {
    data: (data as unknown as RawReelRow[]).map(normalizeReel),
    error: null,
  }
}

// ── getReelsByTicker ─────────────────────────────────────────────
/**
 * Reels tagged with a specific ticker.
 * Uses the GIN-indexed `tickers` text[] column with Postgres array contains (@>).
 */
export async function getReelsByTicker(
  ticker: string,
  limit = 20
): Promise<ServiceResult<ReelWithCreator[]>> {
  const { data, error } = await supabase
    .from('reels')
    .select(REEL_WITH_CREATOR_AND_LIKES)
    // Postgres array overlap: tickers column contains the given ticker
    .contains('tickers', [ticker.toUpperCase()])
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return {
    data: (data as unknown as RawReelRow[]).map(normalizeReel),
    error: null,
  }
}

// ── getUserLikedReelIds ──────────────────────────────────────────
/** Returns the set of reel IDs the given user has liked. */
export async function getUserLikedReelIds(
  userId: string
): Promise<ServiceResult<string[]>> {
  const { data, error } = await supabase
    .from('reel_likes')
    .select('reel_id')
    .eq('user_id', userId)

  if (error) return { data: null, error: error.message }
  return { data: (data ?? []).map(row => row.reel_id), error: null }
}

// ── likeReel ─────────────────────────────────────────────────────
/** Record that a user liked a reel. Idempotent — PK prevents duplicates. */
export async function likeReel(
  reelId: string,
  userId: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('reel_likes')
    .insert({ reel_id: reelId, user_id: userId })

  if (error && error.code !== '23505') return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── unlikeReel ───────────────────────────────────────────────────
/** Remove a reel like. RLS ensures users can only delete their own. */
export async function unlikeReel(
  reelId: string,
  userId: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('reel_likes')
    .delete()
    .eq('reel_id', reelId)
    .eq('user_id', userId)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── getVideosByCreator ───────────────────────────────────────────
/**
 * Long-form videos for a creator's Videos tab.
 * Replaces `getVideosByCreator()` in data/reels.ts.
 */
export async function getVideosByCreator(
  creatorId: string,
  limit = 30
): Promise<ServiceResult<VideoWithCreator[]>> {
  const { data, error } = await supabase
    .from('videos')
    .select(VIDEO_WITH_CREATOR)
    .eq('creator_id', creatorId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as VideoWithCreator[], error: null }
}

// ── getVideoById ─────────────────────────────────────────────────
/** Single video + creator snippet, for the video watch page. */
export async function getVideoById(
  videoId: string
): Promise<ServiceResult<VideoWithCreator>> {
  const { data, error } = await supabase
    .from('videos')
    .select(VIDEO_WITH_CREATOR)
    .eq('id', videoId)
    .eq('moderation_status', 'visible')
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as VideoWithCreator, error: null }
}

// ── createReel ───────────────────────────────────────────────────
/** Create a new reel. Used by CreateReelModal (future Supabase migration). */
export async function createReel(
  payload: Omit<ReelInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<ServiceResult<Reel>> {
  const { data, error } = await supabase
    .from('reels')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}
