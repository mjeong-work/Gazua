/**
 * savedContent.service.ts
 *
 * Data layer for "Saved" content (My Profile > Saved tab — reels for now, extensible to
 * videos/posts later). Backed by the real `saved_content` table (see
 * supabase/migrations/20260712000000_saved_content.sql) — every function is async and
 * ServiceResult-shaped (matching the other *.service.ts files in this folder).
 *
 * Exported function signatures and the SavedContentItem/SavedContentInput shapes are
 * unchanged from the previous localStorage-backed version, so SavedContentContext.tsx and
 * every UI call site need no changes.
 *
 * Guests (no authenticated user — SavedContentContext passes the literal 'guest' sentinel)
 * can't have rows in this table (user_id is a real profiles FK), so every function
 * short-circuits to an empty/no-op result for non-UUID userIds rather than issuing a request
 * that would just fail — saving requires sign-in, matching every other write feature here.
 */
import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { SavedContentType, SavedContentSurface } from '../../types/database'

export type { SavedContentType, SavedContentSurface }

/** Returns true when `s` looks like a Supabase/PostgreSQL UUID (i.e. a real signed-in user,
 * not the 'guest' sentinel SavedContentContext uses for unauthenticated visitors). */
function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export interface SavedContentItem {
  userId: string
  /** Globally unique across all surfaces, e.g. "home-reels:local-3" or "video:7". */
  contentId: string
  contentType: SavedContentType
  surface: SavedContentSurface
  /** The item's original id/db_id within its source dataset — used to build a navigation path. */
  rawId: string
  savedAt: string
  title: string
  thumbnail: string
  creatorName: string
  creatorId?: string
  meta?: string
}

export type SavedContentInput = Omit<SavedContentItem, 'savedAt'>

// ── Row <-> SavedContentItem mapping ────────────────────────────────
interface SavedContentRow {
  user_id: string
  content_id: string
  content_type: SavedContentType
  surface: SavedContentSurface
  raw_id: string
  title: string
  thumbnail: string
  creator_name: string
  creator_id: string | null
  meta: string | null
  saved_at: string
}

function rowToItem(row: SavedContentRow): SavedContentItem {
  return {
    userId: row.user_id,
    contentId: row.content_id,
    contentType: row.content_type,
    surface: row.surface,
    rawId: row.raw_id,
    savedAt: row.saved_at,
    title: row.title,
    thumbnail: row.thumbnail,
    creatorName: row.creator_name,
    creatorId: row.creator_id ?? undefined,
    meta: row.meta ?? undefined,
  }
}

async function fetchAllForUser(userId: string): Promise<ServiceResult<SavedContentItem[]>> {
  const { data, error } = await supabase
    .from('saved_content')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: (data as unknown as SavedContentRow[]).map(rowToItem), error: null }
}

// ── getSavedItems ────────────────────────────────────────────────
export async function getSavedItems(userId: string): Promise<ServiceResult<SavedContentItem[]>> {
  if (!isUUID(userId)) return { data: [], error: null }
  return fetchAllForUser(userId)
}

// ── saveItem ─────────────────────────────────────────────────────
/** Inserts the item, then returns the user's full updated saved list (matching the previous
 * localStorage version's return contract, which SavedContentContext relies on). Idempotent —
 * the (user_id, content_id) unique constraint prevents duplicates on a race/double-click. */
export async function saveItem(item: SavedContentInput): Promise<ServiceResult<SavedContentItem[]>> {
  if (!isUUID(item.userId)) return { data: [], error: null }

  const { error } = await supabase.from('saved_content').insert({
    user_id: item.userId,
    content_id: item.contentId,
    content_type: item.contentType,
    surface: item.surface,
    raw_id: item.rawId,
    title: item.title,
    thumbnail: item.thumbnail,
    creator_name: item.creatorName,
    creator_id: item.creatorId ?? null,
    meta: item.meta ?? null,
  })

  // Unique-violation (already saved) is not an error from the UI's perspective.
  if (error && error.code !== '23505') return { data: null, error: error.message }
  return fetchAllForUser(item.userId)
}

// ── removeItem ───────────────────────────────────────────────────
export async function removeItem(userId: string, contentId: string): Promise<ServiceResult<SavedContentItem[]>> {
  if (!isUUID(userId)) return { data: [], error: null }

  const { error } = await supabase
    .from('saved_content')
    .delete()
    .eq('user_id', userId)
    .eq('content_id', contentId)

  if (error) return { data: null, error: error.message }
  return fetchAllForUser(userId)
}
