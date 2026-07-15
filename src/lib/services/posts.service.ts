import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { Post, PostInsert, PostWithCreator } from '../../types/database'

// ── Select fragment: post + joined creator snippet ────────────────
// The alias `creator` renames the embedded profiles object.
const POST_WITH_CREATOR = `
  *,
  creator:profiles!creator_id (
    id, username, handle, full_name, avatar_url, is_verified
  )
` as const

// ── Internal normalizer ──────────────────────────────────────────
// Supabase returns like counts as [{count: number}] — normalize to PostWithCreator.
type RawPostRow = Post & {
  creator: PostWithCreator['creator']
  post_likes: Array<{ count: number }>
}

function normalizePost(row: RawPostRow): PostWithCreator {
  const { post_likes, ...rest } = row
  return {
    ...rest,
    like_count: post_likes?.[0]?.count ?? 0,
  }
}

const POST_WITH_CREATOR_AND_LIKES = `
  ${POST_WITH_CREATOR},
  post_likes(count)
` as const

// ── getPosts ─────────────────────────────────────────────────────
/**
 * Fetch posts for the main feed.
 * Optionally filter by category or ticker.
 * Results include creator info and like count.
 */
export async function getPosts(options?: {
  category?: string
  ticker?: string
  limit?: number
  offset?: number
}): Promise<ServiceResult<PostWithCreator[]>> {
  let query = supabase
    .from('posts')
    .select(POST_WITH_CREATOR_AND_LIKES)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 20)

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1)
  }
  if (options?.category) {
    query = query.eq('category', options.category)
  }
  if (options?.ticker) {
    query = query.eq('asset', options.ticker.toUpperCase())
  }

  const { data, error } = await query

  if (error) return { data: null, error: error.message }
  return {
    data: (data as unknown as RawPostRow[]).map(normalizePost),
    error: null,
  }
}

// ── getPostsByCreator ────────────────────────────────────────────
/** All posts by a specific creator, newest first. Used on creator profile pages. */
export async function getPostsByCreator(
  creatorId: string,
  limit = 20
): Promise<ServiceResult<PostWithCreator[]>> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_WITH_CREATOR_AND_LIKES)
    .eq('creator_id', creatorId)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return {
    data: (data as unknown as RawPostRow[]).map(normalizePost),
    error: null,
  }
}

// ── getPostsByCreatorIds ─────────────────────────────────────────
/**
 * Fetch posts from a list of creator UUIDs.
 * Used to populate the "Following" feed tab.
 */
export async function getPostsByCreatorIds(
  creatorIds: string[],
  limit = 20
): Promise<ServiceResult<PostWithCreator[]>> {
  if (!creatorIds.length) return { data: [], error: null }

  const { data, error } = await supabase
    .from('posts')
    .select(POST_WITH_CREATOR_AND_LIKES)
    .in('creator_id', creatorIds)
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return {
    data: (data as unknown as RawPostRow[]).map(normalizePost),
    error: null,
  }
}

// ── getPostsByTicker ─────────────────────────────────────────────
/** All posts tagged with a specific ticker. Used by the ticker filter feature. */
export async function getPostsByTicker(
  ticker: string,
  limit = 20
): Promise<ServiceResult<PostWithCreator[]>> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_WITH_CREATOR_AND_LIKES)
    .eq('asset', ticker.toUpperCase())
    .eq('moderation_status', 'visible')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return {
    data: (data as unknown as RawPostRow[]).map(normalizePost),
    error: null,
  }
}

// ── getUserLikedPostIds ──────────────────────────────────────────
/**
 * Returns the set of post IDs the given user has liked.
 * Used to initialize the likedPosts Set in the feed component.
 */
export async function getUserLikedPostIds(
  userId: string
): Promise<ServiceResult<string[]>> {
  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)

  if (error) return { data: null, error: error.message }
  return { data: (data ?? []).map(row => row.post_id), error: null }
}

// ── likePost ─────────────────────────────────────────────────────
/** Record that a user liked a post. Idempotent — duplicate inserts are ignored via PK. */
export async function likePost(
  postId: string,
  userId: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('post_likes')
    .insert({ post_id: postId, user_id: userId })

  // PK violation (already liked) is not an error from the UI's perspective
  if (error && error.code !== '23505') return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── unlikePost ───────────────────────────────────────────────────
/** Remove a like. RLS ensures users can only delete their own likes. */
export async function unlikePost(
  postId: string,
  userId: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── getPostCountByCreator ────────────────────────────────────────
/** Total number of posts by a creator. Used on profile pages. */
export async function getPostCountByCreator(
  creatorId: string
): Promise<ServiceResult<number>> {
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)

  if (error) return { data: null, error: error.message }
  return { data: count ?? 0, error: null }
}

// ── createPost ───────────────────────────────────────────────────
/** Create a new post. Used by CreatePostModal (future Supabase migration). */
export async function createPost(
  payload: Omit<PostInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<ServiceResult<Post>> {
  const { data, error } = await supabase
    .from('posts')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── incrementShareCount ──────────────────────────────────────────
/** Atomically increment the share counter on a post. */
export async function incrementShareCount(postId: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.rpc('increment_post_shares', { post_id: postId })
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}
