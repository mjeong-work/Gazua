import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import { BUCKETS, removeFromBucket } from '../storage'
import type { Reel, ReelInsert, ReelWithCreator, Video, VideoInsert, VideoWithCreator } from '../../types/database'

// ── Select fragments ─────────────────────────────────────────────
const REEL_WITH_CREATOR = `
  *,
  creator:profiles!creator_id (
    id, username, handle, full_name, avatar_url, is_verified, credibility_level
  )
` as const

const REEL_WITH_CREATOR_AND_LIKES = `
  ${REEL_WITH_CREATOR},
  reel_likes(count)
` as const

const VIDEO_WITH_CREATOR = `
  *,
  creator:profiles!creator_id (
    id, username, full_name, avatar_url, is_verified, credibility_level
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

// ── getVideos ────────────────────────────────────────────────────
/** Long-form videos across all creators, for the Creators page's Videos rail. */
export async function getVideos(options?: {
  limit?: number
  offset?: number
}): Promise<ServiceResult<VideoWithCreator[]>> {
  const { data, error } = await supabase
    .from('videos')
    .select(VIDEO_WITH_CREATOR)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 20)

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as VideoWithCreator[], error: null }
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

// ── createVideo ──────────────────────────────────────────────────
/** Create a new long-form video. Used by MyProfilePage's video upload modal. */
export async function createVideo(
  payload: Omit<VideoInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<ServiceResult<Video>> {
  const { data, error } = await supabase
    .from('videos')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── deleteVideo ──────────────────────────────────────────────────
/**
 * Deletes a video: the DB row first (RLS restricts this to the owning creator, and it's
 * what controls visibility on every surface), then a best-effort Storage object removal.
 * If the DB delete fails, nothing is removed — treat as a full failure. If the DB delete
 * succeeds but Storage cleanup fails, the video is already gone from every visible surface;
 * `storageError` is returned (non-fatal) for logging rather than surfaced as a user error.
 *
 * A non-owner's delete is filtered out entirely by RLS rather than erroring — Postgres
 * reports that as a successful delete of zero rows, not an error. Requesting `count`
 * and checking it is what tells the two cases apart; skipping it would let a non-owner's
 * blocked delete report back as a false success.
 */
export async function deleteVideo(
  videoId: string,
  storagePath: string | null | undefined
): Promise<ServiceResult<{ storageError: string | null }>> {
  const { error: dbError, count } = await supabase
    .from('videos')
    .delete({ count: 'exact' })
    .eq('id', videoId)

  if (dbError) return { data: null, error: dbError.message }
  if (!count) return { data: null, error: 'Video not found, or you do not have permission to delete it.' }

  if (!storagePath) return { data: { storageError: null }, error: null }

  const { error: storageErr } = await removeFromBucket(BUCKETS.videos, storagePath)
  return { data: { storageError: storageErr }, error: null }
}

// ── createReel ───────────────────────────────────────────────────
/** Create a new reel. Used by CreateReelModal. */
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
