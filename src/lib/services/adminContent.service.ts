/**
 * adminContent.service.ts
 *
 * Admin-only content browsing (posts/reels/videos/comments, any moderation
 * status) and the remove/restore write path.
 *
 * Reads rely on the "Admins read all X" RLS policies added in
 * 20260711000000_admin_roles_and_moderation.sql. Writes go through the
 * `admin_set_content_moderation_status` SECURITY DEFINER RPC — the browser
 * client never gets a direct UPDATE grant on posts/reels/videos/post_comments
 * for admin purposes.
 */

import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import { logAuditEvent } from './compliance.service'
import type {
  AdminContentItem,
  ContentModerationStatus,
  PaginatedResult,
  SortDirection,
} from '../../types/admin'

type AdminContentType = 'post' | 'reel' | 'video' | 'comment'

const TABLE_BY_TYPE: Record<AdminContentType, string> = {
  post: 'posts',
  reel: 'reels',
  video: 'videos',
  comment: 'post_comments',
}

// ── listContent ──────────────────────────────────────────────────
export async function listContent(opts: {
  contentType: AdminContentType
  status?: ContentModerationStatus
  search?: string
  sortBy?: 'created_at'
  sortDir?: SortDirection
  page: number
  pageSize: number
}): Promise<ServiceResult<PaginatedResult<AdminContentItem>>> {
  const table = TABLE_BY_TYPE[opts.contentType]
  const previewCol = opts.contentType === 'post' ? 'content'
    : opts.contentType === 'reel' ? 'caption'
    : opts.contentType === 'video' ? 'title'
    : 'content'
  const authorCol = opts.contentType === 'comment' ? 'user_id' : 'creator_id'

  let query = supabase
    .from(table as 'posts')
    .select(`id, ${authorCol}, ${previewCol}, moderation_status, created_at`, { count: 'exact' })

  if (opts.status) query = query.eq('moderation_status', opts.status)
  if (opts.search?.trim()) query = query.ilike(previewCol, `%${opts.search.trim()}%`)

  query = query.order(opts.sortBy ?? 'created_at', { ascending: opts.sortDir === 'asc' })

  const from = opts.page * opts.pageSize
  const to = from + opts.pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) return { data: null, error: error.message }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
  const authorIds = [...new Set(rows.map(r => String(r[authorCol])))]

  const { data: authors } = authorIds.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', authorIds)
    : { data: [] as { id: string; username: string; full_name: string }[] }
  const authorMap = new Map((authors ?? []).map(a => [a.id, a]))

  const items: AdminContentItem[] = rows.map(r => {
    const author = authorMap.get(String(r[authorCol]))
    return {
      id: String(r.id),
      contentType: opts.contentType,
      creatorId: String(r[authorCol]),
      creatorUsername: author?.username ?? null,
      creatorName: author?.full_name ?? null,
      preview: String(r[previewCol] ?? ''),
      moderationStatus: r.moderation_status as ContentModerationStatus,
      createdAt: String(r.created_at),
    }
  })

  return {
    data: { rows: items, total: count ?? 0, page: opts.page, pageSize: opts.pageSize },
    error: null,
  }
}

// ── getContentDetail ─────────────────────────────────────────────
export async function getContentDetail(
  contentType: AdminContentType,
  contentId: string
): Promise<ServiceResult<Record<string, unknown>>> {
  const table = TABLE_BY_TYPE[contentType]
  const { data, error } = await supabase.from(table as 'posts').select('*').eq('id', contentId).single()

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as Record<string, unknown>, error: null }
}

// ── setContentModerationStatus ───────────────────────────────────
export async function setContentModerationStatus(params: {
  contentType: AdminContentType
  contentId: string
  status: ContentModerationStatus
  reportId?: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const { error: rpcError } = await supabase.rpc('admin_set_content_moderation_status', {
    p_content_type: params.contentType,
    p_content_id: params.contentId,
    p_status: params.status,
  })

  if (rpcError) return { success: false, error: rpcError.message }

  const { data: { user } } = await supabase.auth.getUser()
  const action = params.status === 'removed' ? 'content_removed' : 'content_restored'

  await (supabase as never as {
    from: (t: string) => { insert: (r: object) => Promise<{ error: { message: string } | null }> }
  }).from('moderation_actions').insert({
    moderator_id: user?.id ?? null,
    report_id: params.reportId ?? null,
    content_type: params.contentType,
    content_id: params.contentId,
    action,
    notes: params.notes ?? null,
  })

  logAuditEvent({
    eventType: `admin_${action}`,
    contentType: params.contentType,
    contentId: params.contentId,
    reportId: params.reportId,
    metadata: { notes: params.notes },
  }).catch(() => {})

  return { success: true }
}
