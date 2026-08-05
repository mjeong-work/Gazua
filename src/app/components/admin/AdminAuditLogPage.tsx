import { useEffect, useState, useCallback } from 'react';
import { listAuditLog } from '../../../lib/services/adminAudit.service';
import AdminDataTable, { type AdminDataTableColumn } from './AdminDataTable';
import AdminPagination from './AdminPagination';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';
import AdminEmptyState from './AdminEmptyState';
import AdminErrorState from './AdminErrorState';
import type { AdminAuditLogItem } from '../../../types/admin';

const PAGE_SIZE = 25;

export default function AdminAuditLogPage() {
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await listAuditLog({
      eventType: eventTypeFilter || undefined,
      page,
      pageSize: PAGE_SIZE,
    });
    if (err || !data) setError(true);
    else { setRows(data.rows); setTotal(data.total); }
    setLoading(false);
  }, [eventTypeFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [eventTypeFilter]);

  const columns: AdminDataTableColumn<AdminAuditLogItem>[] = [
    {
      key: 'event_type',
      label: 'Event',
      render: item => <span className="text-sm font-medium capitalize">{item.event_type.replace(/_/g, ' ')}</span>,
    },
    { key: 'actor', label: 'Actor', render: item => <span className="text-neutral-600">{item.actorUsername ? `@${item.actorUsername}` : '—'}</span> },
    {
      key: 'content',
      label: 'Target',
      render: item => (
        item.content_type ? (
          <span className="text-xs text-neutral-500 font-mono">{item.content_type}: {item.content_id}</span>
        ) : <span className="text-neutral-300">—</span>
      ),
    },
    {
      key: 'created_at',
      label: 'When',
      render: item => <span className="text-neutral-500">{new Date(item.created_at).toLocaleString()}</span>,
    },
  ];

  const EVENT_TYPES = ['content_reported', 'moderation_action', 'admin_report_resolved', 'admin_content_removed', 'admin_content_restored', 'admin_warning_sent', 'admin_user_suspended', 'admin_user_reinstated'];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-neutral-500 mt-1">Complete, read-only history of admin and compliance events.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setEventTypeFilter('')}
          className={`px-4 py-2 text-xs font-medium rounded-full border transition-colors ${
            eventTypeFilter === '' ? 'bg-black text-white border-black' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          All events
        </button>
        {EVENT_TYPES.map(et => (
          <button
            key={et}
            onClick={() => setEventTypeFilter(et)}
            className={`px-4 py-2 text-xs font-medium rounded-full border transition-colors capitalize ${
              eventTypeFilter === et ? 'bg-black text-white border-black' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {et.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <AdminLoadingSkeleton />
      ) : error ? (
        <AdminErrorState onRetry={load} />
      ) : rows.length === 0 ? (
        <AdminEmptyState message="No audit events yet." />
      ) : (
        <>
          <AdminDataTable columns={columns} rows={rows} rowKey={r => r.id} />
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
