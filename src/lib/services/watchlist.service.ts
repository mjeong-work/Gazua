import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type {
  WatchlistItem,
  WatchlistItemInsert,
  WatchlistItemUpdate,
  WatchlistSourceType,
} from '../../types/database'

// ── getWatchlistItems ────────────────────────────────────────────
/**
 * Fetch all watchlist items for a user, newest first.
 * RLS ensures only the owner's rows are returned.
 * Replaces MOCK_WATCHLIST_ITEMS in WatchlistContext.
 */
export async function getWatchlistItems(
  userId: string
): Promise<ServiceResult<WatchlistItem[]>> {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

// ── addWatchlistItem ─────────────────────────────────────────────
/**
 * Add a new item to the user's watchlist.
 * Replaces `addToWatchlist` in WatchlistContext.
 *
 * Supabase returns a 409 / PK-violation error if the unique index on
 * (user_id, source_type, source_content_id) is triggered — handled gracefully.
 */
export async function addWatchlistItem(
  userId: string,
  payload: Omit<WatchlistItemInsert, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<ServiceResult<WatchlistItem>> {
  const { data, error } = await supabase
    .from('watchlist_items')
    .insert({ ...payload, user_id: userId })
    .select()
    .single()

  // Unique constraint violation — item already saved
  if (error?.code === '23505') {
    return { data: null, error: 'This item is already in your watchlist.' }
  }
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── updateWatchlistItem ──────────────────────────────────────────
/**
 * Update thesis fields or status on an existing watchlist item.
 * Replaces `updateItem` in WatchlistContext.
 * RLS enforces ownership — the update silently no-ops if userId doesn't match.
 */
export async function updateWatchlistItem(
  id: string,
  userId: string,
  updates: WatchlistItemUpdate
): Promise<ServiceResult<WatchlistItem>> {
  const { data, error } = await supabase
    .from('watchlist_items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── removeWatchlistItem ──────────────────────────────────────────
/**
 * Remove an item from the watchlist by its UUID.
 * Replaces `removeFromWatchlist` in WatchlistContext.
 */
export async function removeWatchlistItem(
  id: string,
  userId: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── removeWatchlistItemBySource ──────────────────────────────────
/**
 * Remove a watchlist item by its source reference (post/reel/model UUID).
 * Replaces `removeBySource` in WatchlistContext.
 */
export async function removeWatchlistItemBySource(
  userId: string,
  sourceType: WatchlistSourceType,
  sourceContentId: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_content_id', sourceContentId)

  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── isTickerSaved ────────────────────────────────────────────────
/**
 * Check if a user has already saved a given ticker (manual add path).
 * Returns true if any watchlist item has the same ticker.
 */
export async function isTickerSaved(
  userId: string,
  ticker: string
): Promise<ServiceResult<boolean>> {
  const { count, error } = await supabase
    .from('watchlist_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('ticker', ticker.toUpperCase())

  if (error) return { data: null, error: error.message }
  return { data: (count ?? 0) > 0, error: null }
}

// ── isContentSaved ───────────────────────────────────────────────
/**
 * Check if a specific piece of content (post/reel/model) is already saved.
 * Replaces `isSaved` in WatchlistContext.
 */
export async function isContentSaved(
  userId: string,
  sourceType: WatchlistSourceType,
  sourceContentId: string
): Promise<ServiceResult<boolean>> {
  const { count, error } = await supabase
    .from('watchlist_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_content_id', sourceContentId)

  if (error) return { data: null, error: error.message }
  return { data: (count ?? 0) > 0, error: null }
}

// ── getSavedContentIds ───────────────────────────────────────────
/**
 * Returns all saved source_content_ids for a given source_type.
 * Efficient batch version of isContentSaved — fetches once, check many.
 * Used to initialize the "saved" state in feed components.
 */
export async function getSavedContentIds(
  userId: string,
  sourceType: WatchlistSourceType
): Promise<ServiceResult<string[]>> {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('source_content_id')
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .not('source_content_id', 'is', null)

  if (error) return { data: null, error: error.message }
  return {
    data: (data ?? []).map(row => row.source_content_id as string),
    error: null,
  }
}
