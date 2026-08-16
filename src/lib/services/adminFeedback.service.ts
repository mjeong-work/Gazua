/**
 * adminFeedback.service.ts
 *
 * Admin-only triage queue for the in-app feedback channel (feedback.service.ts's
 * submitFeedback() is the write side). Same paginated-list + status-update shape as
 * adminReports.service.ts, minus the side-effect dispatch — a feedback item's only
 * state is its own triage status, there's nothing else to apply it to.
 */

import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { AdminFeedbackListItem, PaginatedResult } from '../../types/admin'
import type { FeedbackStatus } from '../../types/database'

// ── listFeedback ─────────────────────────────────────────────────
export async function listFeedback(opts: {
  status?: FeedbackStatus
  page: number
  pageSize: number
}): Promise<ServiceResult<PaginatedResult<AdminFeedbackListItem>>> {
  let query = supabase
    .from('feedback')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (opts.status) query = query.eq('status', opts.status)

  const from = opts.page * opts.pageSize
  const to = from + opts.pageSize - 1
  const { data, error, count } = await query.range(from, to)

  if (error) return { data: null, error: error.message }

  const rows = data ?? []
  const userIds = [...new Set(rows.map(r => r.user_id))]
  const usernameByUserId = new Map<string, string>()

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds)
    for (const p of profiles ?? []) usernameByUserId.set(p.id, p.username)
  }

  const items: AdminFeedbackListItem[] = rows.map(r => ({
    id: r.id,
    user_id: r.user_id,
    authorUsername: usernameByUserId.get(r.user_id) ?? null,
    message: r.message,
    page_url: r.page_url,
    status: r.status,
    created_at: r.created_at,
  }))

  return {
    data: { rows: items, total: count ?? 0, page: opts.page, pageSize: opts.pageSize },
    error: null,
  }
}

// ── updateFeedbackStatus ─────────────────────────────────────────
export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('feedback').update({ status }).eq('id', feedbackId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
