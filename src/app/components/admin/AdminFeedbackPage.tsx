import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { listFeedback, updateFeedbackStatus } from '../../../lib/services/adminFeedback.service';
import AdminSearchFilterBar from './AdminSearchFilterBar';
import AdminStatusBadge from './AdminStatusBadge';
import AdminPagination from './AdminPagination';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';
import AdminEmptyState from './AdminEmptyState';
import AdminErrorState from './AdminErrorState';
import type { AdminFeedbackListItem } from '../../../types/admin';
import type { FeedbackStatus } from '../../../types/database';

const PAGE_SIZE = 10;

// Triage queue for FeedbackModal submissions. Deliberately no confirm dialog on status
// changes (unlike AdminReportsPage) — moving new -> reviewed -> resolved has no side effect
// on anyone's account or content, it's just bookkeeping for whoever's working the queue.
export default function AdminFeedbackPage() {
  const [statusFilter, setStatusFilter] = useState<'new' | 'all'>('new');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<AdminFeedbackListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await listFeedback({
      status: statusFilter === 'new' ? 'new' : undefined,
      page,
      pageSize: PAGE_SIZE,
    });
    if (err || !data) setError(true);
    else { setRows(data.rows); setTotal(data.total); }
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [statusFilter]);

  const setStatus = async (item: AdminFeedbackListItem, status: FeedbackStatus) => {
    const { success, error: err } = await updateFeedbackStatus(item.id, status);
    if (success) {
      toast.success(`Marked ${status}`);
      load();
    } else {
      toast.error(err ?? 'Failed to update');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-sm text-neutral-500 mt-1">Bug reports and feedback submitted from inside the app.</p>
      </div>

      <AdminSearchFilterBar
        filters={[
          {
            key: 'status',
            value: statusFilter,
            onChange: v => setStatusFilter(v as 'new' | 'all'),
            options: [
              { value: 'new', label: 'New' },
              { value: 'all', label: 'All' },
            ],
          },
        ]}
      />

      {loading ? (
        <AdminLoadingSkeleton />
      ) : error ? (
        <AdminErrorState onRetry={load} />
      ) : rows.length === 0 ? (
        <AdminEmptyState message={statusFilter === 'new' ? 'No new feedback.' : 'No feedback yet.'} />
      ) : (
        <>
          <div className="space-y-4">
            {rows.map(item => (
              <div
                key={item.id}
                className={`border rounded-md p-5 transition-opacity ${item.status === 'resolved' ? 'opacity-60' : ''} border-neutral-200`}
              >
                <div className="flex items-start gap-3 mb-3 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-0.5">
                    {item.authorUsername ?? 'Unknown user'}
                  </span>
                  <AdminStatusBadge status={item.status} />
                </div>

                <p className="text-[11px] text-neutral-400 mb-2 font-mono">
                  {new Date(item.created_at).toLocaleString()}
                  {item.page_url && (
                    <span className="ml-3 font-sans not-italic break-all">· {item.page_url}</span>
                  )}
                </p>

                <div className="bg-neutral-50 border border-neutral-100 rounded-sm px-3 py-2 mb-3">
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">{item.message}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.status !== 'reviewed' && (
                    <button
                      onClick={() => setStatus(item, 'reviewed')}
                      className="px-4 py-2 text-xs font-medium rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      Mark Reviewed
                    </button>
                  )}
                  {item.status !== 'resolved' && (
                    <button
                      onClick={() => setStatus(item, 'resolved')}
                      className="px-4 py-2 text-xs font-medium rounded-full border border-neutral-800 text-neutral-900 hover:bg-neutral-100 transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {item.status !== 'new' && (
                    <button
                      onClick={() => setStatus(item, 'new')}
                      className="px-4 py-2 text-xs font-medium rounded-full border border-neutral-200 text-neutral-400 hover:bg-neutral-50 transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
