import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { listReports, resolveReport } from '../../../lib/services/adminReports.service';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import AdminSearchFilterBar from './AdminSearchFilterBar';
import AdminStatusBadge from './AdminStatusBadge';
import AdminConfirmDialog from './AdminConfirmDialog';
import AdminPagination from './AdminPagination';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';
import AdminEmptyState from './AdminEmptyState';
import AdminErrorState from './AdminErrorState';
import type { ModerationActionType } from '../../../types/compliance';
import type { AdminReportListItem } from '../../../types/admin';

const PAGE_SIZE = 10;

const REASON_LABELS: Record<string, string> = {
  guaranteed_returns: 'Guaranteed Returns',
  coordinated_trading: 'Coordinated Trading',
  buy_sell_instructions: 'Buy/Sell Instructions',
  undisclosed_promotion: 'Undisclosed Promotion',
  fraud_allegation: 'Fraud Allegation',
  other: 'Other',
};

interface PendingConfirm {
  report: AdminReportListItem;
  action: ModerationActionType;
}

export default function AdminReportsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<AdminReportListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await listReports({
      status: statusFilter === 'pending' ? 'pending' : undefined,
      search: debouncedSearch,
      page,
      pageSize: PAGE_SIZE,
    });
    if (err || !data) setError(true);
    else { setRows(data.rows); setTotal(data.total); }
    setLoading(false);
  }, [statusFilter, debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [statusFilter, debouncedSearch]);

  const runAction = async (report: AdminReportListItem, action: ModerationActionType, notes?: string) => {
    const { success, error: err } = await resolveReport({
      reportId: report.id,
      action,
      contentType: report.content_type,
      contentId: report.content_id,
      notes,
    });
    setConfirm(null);
    if (success) {
      toast.success('Report resolved');
      load();
    } else {
      toast.error(err ?? 'Failed to resolve report');
    }
  };

  const isProfileReport = (r: AdminReportListItem) => r.content_type === 'creator_profile';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-neutral-500 mt-1">Review user-reported content and accounts.</p>
      </div>

      <AdminSearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search report details…"
        filters={[
          {
            key: 'status',
            value: statusFilter,
            onChange: v => setStatusFilter(v as 'pending' | 'all'),
            options: [
              { value: 'pending', label: 'Pending' },
              { value: 'all', label: 'All Reports' },
            ],
          },
        ]}
      />

      {loading ? (
        <AdminLoadingSkeleton />
      ) : error ? (
        <AdminErrorState onRetry={load} />
      ) : rows.length === 0 ? (
        <AdminEmptyState message={statusFilter === 'pending' ? 'No pending reports.' : 'No reports found.'} />
      ) : (
        <>
          <div className="space-y-4">
            {rows.map(report => (
              <div
                key={report.id}
                className={`border rounded-md p-5 transition-opacity ${report.status !== 'pending' ? 'opacity-60' : ''} border-neutral-200`}
              >
                <div className="flex items-start gap-3 mb-3 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-0.5">{report.content_type}</span>
                  <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-sm font-medium">
                    {REASON_LABELS[report.reason] ?? report.reason}
                  </span>
                  <AdminStatusBadge status={report.status} />
                </div>

                <p className="text-[11px] text-neutral-400 mb-2 font-mono">
                  {report.content_type}: {report.content_id}
                  <span className="ml-3 font-sans not-italic">· {new Date(report.created_at).toLocaleString()}</span>
                </p>

                {report.details && (
                  <div className="bg-neutral-50 border border-neutral-100 rounded-sm px-3 py-2 mb-3">
                    <p className="text-sm text-neutral-700 italic">"{report.details}"</p>
                  </div>
                )}

                {report.status === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => runAction(report, 'dismissed')}
                      className="px-4 py-2 text-xs font-medium rounded-sm border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      Dismiss
                    </button>
                    {isProfileReport(report) ? (
                      <>
                        <button
                          onClick={() => setConfirm({ report, action: 'warning_sent' })}
                          className="px-4 py-2 text-xs font-medium rounded-sm border border-neutral-800 text-neutral-900 hover:bg-neutral-100 transition-colors"
                        >
                          Send Warning
                        </button>
                        <button
                          onClick={() => setConfirm({ report, action: 'user_suspended' })}
                          className="px-4 py-2 text-xs font-medium rounded-sm border border-red-300 text-red-800 hover:bg-red-50 transition-colors"
                        >
                          Suspend User
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirm({ report, action: 'content_removed' })}
                        className="px-4 py-2 text-xs font-medium rounded-sm border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
                      >
                        Remove Content
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}

      {confirm && (
        <AdminConfirmDialog
          title={
            confirm.action === 'warning_sent' ? 'Send warning to this account?'
              : confirm.action === 'user_suspended' ? 'Suspend this account?'
              : 'Remove this content?'
          }
          withNotes
          destructive={confirm.action !== 'warning_sent'}
          confirmLabel={
            confirm.action === 'warning_sent' ? 'Send Warning'
              : confirm.action === 'user_suspended' ? 'Suspend'
              : 'Remove'
          }
          onConfirm={notes => runAction(confirm.report, confirm.action, notes)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
