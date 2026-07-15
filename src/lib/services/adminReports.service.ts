/**
 * adminReports.service.ts
 *
 * Admin-only report queue: paginated/filterable superset of
 * compliance.service.ts's getPendingReports(), plus resolveReport() — the
 * single entry point that maps a report action to its real side effect so
 * that logic isn't duplicated across the Reports page and the Content page.
 */

import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import { logAuditEvent } from './compliance.service'
import { setContentModerationStatus } from './adminContent.service'
import { setUserStatus } from './adminUsers.service'
import type { ContentType, ModerationActionType, ReportReason } from '../../types/compliance'
import type { AdminReportListItem, PaginatedResult, SortDirection } from '../../types/admin'

type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed'

// Untyped-table query builder shape (content_reports isn't in database.ts yet — see
// compliance.service.ts's file header for why). Each method returns the same shape so
// filters can be applied conditionally before the final `range()` executes the query.
interface ReportsQueryBuilder {
  eq: (col: string, val: string) => ReportsQueryBuilder
  ilike: (col: string, val: string) => ReportsQueryBuilder
  order: (col: string, opts: { ascending: boolean }) => ReportsQueryBuilder
  range: (from: number, to: number) => Promise<{
    data: AdminReportListItem[] | null
    error: { message: string } | null
    count: number | null
  }>
}

// ── listReports ──────────────────────────────────────────────────
export async function listReports(opts: {
  status?: ReportStatus
  contentType?: ContentType
  reason?: ReportReason
  search?: string
  sortBy?: 'created_at'
  sortDir?: SortDirection
  page: number
  pageSize: number
}): Promise<ServiceResult<PaginatedResult<AdminReportListItem>>> {
  let query = (supabase as never as {
    from: (t: string) => { select: (s: string, opts: object) => ReportsQueryBuilder }
  }).from('content_reports').select('*', { count: 'exact' })

  if (opts.status) query = query.eq('status', opts.status)
  if (opts.contentType) query = query.eq('content_type', opts.contentType)
  if (opts.reason) query = query.eq('reason', opts.reason)
  if (opts.search?.trim()) query = query.ilike('details', `%${opts.search.trim()}%`)

  query = query.order(opts.sortBy ?? 'created_at', { ascending: opts.sortDir === 'asc' })

  const from = opts.page * opts.pageSize
  const to = from + opts.pageSize - 1
  const { data, error, count } = await query.range(from, to)

  if (error) return { data: null, error: error.message }
  return {
    data: { rows: data ?? [], total: count ?? 0, page: opts.page, pageSize: opts.pageSize },
    error: null,
  }
}

// ── getReportDetail ──────────────────────────────────────────────
export async function getReportDetail(reportId: string): Promise<ServiceResult<AdminReportListItem>> {
  const { data, error } = await (supabase as never as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: AdminReportListItem | null; error: { message: string } | null }>
        }
      }
    }
  }).from('content_reports').select('*').eq('id', reportId).single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ── resolveReport ────────────────────────────────────────────────
/**
 * Maps a report action to its real side effect:
 *  - dismissed              -> just updates content_reports.status
 *  - content_removed/_restored -> delegates to adminContent.setContentModerationStatus
 *  - warning_sent/user_suspended/user_reinstated -> delegates to adminUsers.setUserStatus
 *    (content_type must be 'creator_profile' and content_id the target user's id)
 */
export async function resolveReport(params: {
  reportId: string
  action: ModerationActionType
  contentType: ContentType
  contentId: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  if (params.action === 'content_removed' || params.action === 'content_restored') {
    if (params.contentType === 'creator_profile') {
      return { success: false, error: 'Cannot remove/restore a creator_profile — use warn/suspend/reinstate.' }
    }
    const result = await setContentModerationStatus({
      contentType: params.contentType as 'post' | 'reel' | 'video' | 'comment',
      contentId: params.contentId,
      status: params.action === 'content_removed' ? 'removed' : 'visible',
      reportId: params.reportId,
      notes: params.notes,
    })
    if (!result.success) return result
  } else if (
    params.action === 'warning_sent' ||
    params.action === 'user_suspended' ||
    params.action === 'user_reinstated'
  ) {
    if (params.contentType !== 'creator_profile') {
      return { success: false, error: 'warn/suspend/reinstate requires a creator_profile report.' }
    }
    const status = params.action === 'user_suspended' ? 'suspended'
      : params.action === 'user_reinstated' ? 'active'
      : 'warned'
    const result = await setUserStatus({
      userId: params.contentId,
      status,
      reason: params.notes,
      action: params.action,
    })
    if (!result.success) return result
  }
  // 'dismissed' — no side effect beyond the status update below.

  const newStatus: ReportStatus = params.action === 'dismissed' ? 'dismissed' : 'actioned'
  const { error } = await (supabase as never as {
    from: (t: string) => {
      update: (r: object) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> }
    }
  }).from('content_reports').update({ status: newStatus }).eq('id', params.reportId)

  if (error) return { success: false, error: error.message }

  logAuditEvent({
    eventType: 'admin_report_resolved',
    contentType: params.contentType,
    contentId: params.contentId,
    reportId: params.reportId,
    metadata: { action: params.action, notes: params.notes },
  }).catch(() => {})

  return { success: true }
}
