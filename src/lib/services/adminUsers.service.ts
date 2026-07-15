/**
 * adminUsers.service.ts
 *
 * Admin-only user management: list/search/filter/paginate, single-user detail
 * (profile + content history + reports + moderation history), and the
 * warn/suspend/reinstate write path.
 *
 * Reads on `profiles` rely on the "Admins read all profiles" RLS policy
 * added in 20260711000000_admin_roles_and_moderation.sql — a non-admin
 * session gets rows filtered down to whatever base policy already exists
 * (typically none/self-only), never an error, so these functions degrade to
 * empty results rather than throwing for a non-admin caller.
 *
 * Writes go through the `admin_set_user_status` SECURITY DEFINER RPC (also
 * added by that migration) rather than a direct `.update()` — the RPC
 * re-checks is_admin() server-side and only ever touches status/suspended_*
 * columns, so this file cannot be tricked into writing arbitrary profile
 * fields even if the client-side AdminGuard were somehow bypassed.
 */

import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import { logAuditEvent } from './compliance.service'
import type {
  AdminRole,
  AdminUserDetail,
  AdminUserListItem,
  AdminModerationActionItem,
  AdminReportListItem,
  PaginatedResult,
  SortDirection,
  UserStatus,
} from '../../types/admin'

const USER_LIST_COLUMNS = `
  id, username, full_name, avatar_url, is_creator, subscription_tier, role, status, created_at
` as const

const USER_DETAIL_COLUMNS = `
  id, username, handle, full_name, avatar_url, bio, is_creator, subscription_tier,
  role, status, suspended_at, suspended_reason, created_at
` as const

// ── listUsers ────────────────────────────────────────────────────
export async function listUsers(opts: {
  search?: string
  role?: AdminRole
  status?: UserStatus
  isCreator?: boolean
  sortBy?: 'created_at' | 'username' | 'full_name'
  sortDir?: SortDirection
  page: number
  pageSize: number
}): Promise<ServiceResult<PaginatedResult<AdminUserListItem>>> {
  let query = supabase
    .from('profiles')
    .select(USER_LIST_COLUMNS, { count: 'exact' })

  if (opts.search?.trim()) {
    const term = opts.search.trim()
    query = query.or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
  }
  if (opts.role) query = query.eq('role', opts.role)
  if (opts.status) query = query.eq('status', opts.status)
  if (opts.isCreator !== undefined) query = query.eq('is_creator', opts.isCreator)

  const sortBy = opts.sortBy ?? 'created_at'
  const sortDir = opts.sortDir ?? 'desc'
  query = query.order(sortBy, { ascending: sortDir === 'asc' })

  const from = opts.page * opts.pageSize
  const to = from + opts.pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) return { data: null, error: error.message }
  return {
    data: {
      rows: (data ?? []) as unknown as AdminUserListItem[],
      total: count ?? 0,
      page: opts.page,
      pageSize: opts.pageSize,
    },
    error: null,
  }
}

// ── getUserDetail ────────────────────────────────────────────────
export async function getUserDetail(userId: string): Promise<ServiceResult<AdminUserDetail>> {
  const [profileRes, postCountRes, reelCountRes, videoCountRes, followerRes, followingRes] =
    await Promise.all([
      supabase.from('profiles').select(USER_DETAIL_COLUMNS).eq('id', userId).single(),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('creator_id', userId),
      supabase.from('reels').select('*', { count: 'exact', head: true }).eq('creator_id', userId),
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('creator_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('creator_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ])

  if (profileRes.error) return { data: null, error: profileRes.error.message }

  return {
    data: {
      ...(profileRes.data as unknown as AdminUserDetail),
      postCount: postCountRes.count ?? 0,
      reelCount: reelCountRes.count ?? 0,
      videoCount: videoCountRes.count ?? 0,
      followerCount: followerRes.count ?? 0,
      followingCount: followingRes.count ?? 0,
    },
    error: null,
  }
}

// ── getUserContentHistory ────────────────────────────────────────
/** Admin-scoped — deliberately does NOT filter by moderation_status, so removed
 * items are still visible here (unlike the public feed services). */
export async function getUserContentHistory(userId: string): Promise<ServiceResult<{
  posts: Array<{ id: string; asset: string; content: string; moderation_status: string; created_at: string }>
  reels: Array<{ id: string; caption: string; moderation_status: string; created_at: string }>
  videos: Array<{ id: string; title: string; moderation_status: string; created_at: string }>
}>> {
  const [postsRes, reelsRes, videosRes] = await Promise.all([
    supabase
      .from('posts')
      .select('id, asset, content, moderation_status, created_at')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('reels')
      .select('id, caption, moderation_status, created_at')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('videos')
      .select('id, title, moderation_status, created_at')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (postsRes.error) return { data: null, error: postsRes.error.message }
  if (reelsRes.error) return { data: null, error: reelsRes.error.message }
  if (videosRes.error) return { data: null, error: videosRes.error.message }

  return {
    data: {
      posts: (postsRes.data ?? []) as unknown as { id: string; asset: string; content: string; moderation_status: string; created_at: string }[],
      reels: (reelsRes.data ?? []) as unknown as { id: string; caption: string; moderation_status: string; created_at: string }[],
      videos: (videosRes.data ?? []) as unknown as { id: string; title: string; moderation_status: string; created_at: string }[],
    },
    error: null,
  }
}

// ── getUserReportsFiled ──────────────────────────────────────────
/** Reports this user submitted against other content/accounts. */
export async function getUserReportsFiled(userId: string): Promise<ServiceResult<AdminReportListItem[]>> {
  const { data, error } = await (supabase as never as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: object) => Promise<{ data: AdminReportListItem[] | null; error: { message: string } | null }>
        }
      }
    }
  }).from('content_reports').select('*').eq('reporter_id', userId).order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

// ── getUserReportsAgainst ────────────────────────────────────────
/**
 * Reports referencing this user's account directly (content_type='creator_profile')
 * or any of this user's own content. content_reports has no denormalized "target
 * user" column, so content-level reports require a 2-step id lookup first —
 * acceptable at MVP data volumes.
 */
export async function getUserReportsAgainst(userId: string): Promise<ServiceResult<AdminReportListItem[]>> {
  const [postsRes, reelsRes, videosRes] = await Promise.all([
    supabase.from('posts').select('id').eq('creator_id', userId),
    supabase.from('reels').select('id').eq('creator_id', userId),
    supabase.from('videos').select('id').eq('creator_id', userId),
  ])

  const contentIds = [
    userId, // for content_type = 'creator_profile'
    ...((postsRes.data ?? []) as { id: string }[]).map(r => r.id),
    ...((reelsRes.data ?? []) as { id: string }[]).map(r => r.id),
    ...((videosRes.data ?? []) as { id: string }[]).map(r => r.id),
  ]

  const { data, error } = await (supabase as never as {
    from: (t: string) => {
      select: (s: string) => {
        in: (col: string, vals: string[]) => {
          order: (col: string, opts: object) => Promise<{ data: AdminReportListItem[] | null; error: { message: string } | null }>
        }
      }
    }
  }).from('content_reports').select('*').in('content_id', contentIds).order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

// ── getUserModerationHistory ─────────────────────────────────────
/** Direct account-level actions (warn/suspend/reinstate) taken against this user. */
export async function getUserModerationHistory(userId: string): Promise<ServiceResult<AdminModerationActionItem[]>> {
  const { data, error } = await (supabase as never as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: object) => Promise<{ data: AdminModerationActionItem[] | null; error: { message: string } | null }>
          }
        }
      }
    }
  }).from('moderation_actions').select('*').eq('content_type', 'user').eq('content_id', userId).order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data ?? [], error: null }
}

// ── setUserStatus ─────────────────────────────────────────────────
/** Warn, suspend, or reinstate a user. Writes go through the admin_set_user_status
 * RPC (server-enforced is_admin() check), then a moderation_actions row + audit log. */
export async function setUserStatus(params: {
  userId: string
  status: UserStatus
  reason?: string
  action: 'warning_sent' | 'user_suspended' | 'user_reinstated'
}): Promise<{ success: boolean; error?: string }> {
  const { error: rpcError } = await supabase.rpc('admin_set_user_status', {
    p_user_id: params.userId,
    p_status: params.status,
    p_reason: params.reason ?? null,
  })

  if (rpcError) return { success: false, error: rpcError.message }

  const { data: { user } } = await supabase.auth.getUser()

  await (supabase as never as {
    from: (t: string) => { insert: (r: object) => Promise<{ error: { message: string } | null }> }
  }).from('moderation_actions').insert({
    moderator_id: user?.id ?? null,
    report_id: null,
    content_type: 'user',
    content_id: params.userId,
    action: params.action,
    notes: params.reason ?? null,
  })

  logAuditEvent({
    eventType: `admin_${params.action}`,
    contentType: 'creator_profile',
    contentId: params.userId,
    metadata: { status: params.status, reason: params.reason },
  }).catch(() => {})

  return { success: true }
}
