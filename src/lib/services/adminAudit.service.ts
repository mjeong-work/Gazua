/**
 * adminAudit.service.ts
 *
 * Read-only, paginated/filterable view over compliance_audit_logs — the
 * complete audit trail for admin actions (and the compliance-screening
 * events already logged by compliance.service.ts's logAuditEvent()). Same
 * inline-cast pattern as compliance.service.ts, since this table isn't in
 * database.ts yet.
 */

import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { AdminAuditLogItem, PaginatedResult } from '../../types/admin'

interface AuditQueryBuilder {
  eq: (col: string, val: string) => AuditQueryBuilder
  order: (col: string, opts: { ascending: boolean }) => AuditQueryBuilder
  range: (from: number, to: number) => Promise<{
    data: AdminAuditLogItem[] | null
    error: { message: string } | null
    count: number | null
  }>
}

// ── listAuditLog ─────────────────────────────────────────────────
export async function listAuditLog(opts: {
  eventType?: string
  userId?: string
  contentType?: string
  page: number
  pageSize: number
}): Promise<ServiceResult<PaginatedResult<AdminAuditLogItem>>> {
  let query = (supabase as never as {
    from: (t: string) => { select: (s: string, opts: object) => AuditQueryBuilder }
  }).from('compliance_audit_logs').select('*', { count: 'exact' })

  if (opts.eventType) query = query.eq('event_type', opts.eventType)
  if (opts.userId) query = query.eq('user_id', opts.userId)
  if (opts.contentType) query = query.eq('content_type', opts.contentType)

  query = query.order('created_at', { ascending: false })

  const from = opts.page * opts.pageSize
  const to = from + opts.pageSize - 1
  const { data, error, count } = await query.range(from, to)

  if (error) return { data: null, error: error.message }

  const rows = data ?? []
  const userIds = [...new Set(rows.map(r => r.user_id).filter((id): id is string => !!id))]
  const { data: users } = userIds.length
    ? await supabase.from('profiles').select('id, username').in('id', userIds)
    : { data: [] as { id: string; username: string }[] }
  const userMap = new Map((users ?? []).map(u => [u.id, u.username]))

  return {
    data: {
      rows: rows.map(r => ({ ...r, actorUsername: r.user_id ? userMap.get(r.user_id) ?? null : null })),
      total: count ?? 0,
      page: opts.page,
      pageSize: opts.pageSize,
    },
    error: null,
  }
}
