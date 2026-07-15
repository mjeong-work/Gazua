import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { listContent, setContentModerationStatus } from '../../../lib/services/adminContent.service';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import AdminSearchFilterBar from './AdminSearchFilterBar';
import AdminDataTable, { type AdminDataTableColumn } from './AdminDataTable';
import AdminStatusBadge from './AdminStatusBadge';
import AdminConfirmDialog from './AdminConfirmDialog';
import AdminPagination from './AdminPagination';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';
import AdminEmptyState from './AdminEmptyState';
import AdminErrorState from './AdminErrorState';
import type { AdminContentItem, ContentModerationStatus } from '../../../types/admin';

const PAGE_SIZE = 20;
type ContentTab = 'post' | 'reel' | 'video' | 'comment';

interface PendingConfirm {
  item: AdminContentItem;
  status: ContentModerationStatus;
}

export default function AdminContentPage() {
  const [tab, setTab] = useState<ContentTab>('post');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [statusFilter, setStatusFilter] = useState<ContentModerationStatus | ''>('');
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<AdminContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await listContent({
      contentType: tab,
      status: statusFilter || undefined,
      search: debouncedSearch,
      page,
      pageSize: PAGE_SIZE,
    });
    if (err || !data) setError(true);
    else { setRows(data.rows); setTotal(data.total); }
    setLoading(false);
  }, [tab, statusFilter, debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [tab, statusFilter, debouncedSearch]);

  const handleConfirm = async () => {
    if (!confirm) return;
    const { success, error: err } = await setContentModerationStatus({
      contentType: confirm.item.contentType,
      contentId: confirm.item.id,
      status: confirm.status,
    });
    setConfirm(null);
    if (success) { toast.success(confirm.status === 'removed' ? 'Content removed' : 'Content restored'); load(); }
    else toast.error(err ?? 'Failed to update content');
  };

  const columns: AdminDataTableColumn<AdminContentItem>[] = [
    {
      key: 'preview',
      label: 'Content',
      render: item => <p className="text-sm text-gray-700 line-clamp-2 max-w-md">{item.preview}</p>,
    },
    {
      key: 'creator',
      label: 'Creator',
      render: item => <span className="text-gray-600">{item.creatorName ?? item.creatorUsername ?? '—'}</span>,
    },
    { key: 'status', label: 'Status', render: item => <AdminStatusBadge status={item.moderationStatus} /> },
    {
      key: 'created_at',
      label: 'Created',
      render: item => <span className="text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: item => (
        item.moderationStatus === 'visible' ? (
          <button
            onClick={() => setConfirm({ item, status: 'removed' })}
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={() => setConfirm({ item, status: 'visible' })}
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Restore
          </button>
        )
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Content</h1>
        <p className="text-sm text-gray-500 mt-1">Browse and moderate posts, Reels, videos, and comments.</p>
      </div>

      <div className="flex gap-2">
        {(['post', 'reel', 'video', 'comment'] as ContentTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-medium rounded-full border transition-colors capitalize ${
              tab === t ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t}s
          </button>
        ))}
      </div>

      <AdminSearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search content…"
        filters={[
          {
            key: 'status',
            value: statusFilter,
            onChange: v => setStatusFilter(v as ContentModerationStatus | ''),
            options: [
              { value: '', label: 'All' },
              { value: 'visible', label: 'Visible' },
              { value: 'removed', label: 'Removed' },
            ],
          },
        ]}
      />

      {loading ? (
        <AdminLoadingSkeleton />
      ) : error ? (
        <AdminErrorState onRetry={load} />
      ) : rows.length === 0 ? (
        <AdminEmptyState message="No content matches your filters." />
      ) : (
        <>
          <AdminDataTable columns={columns} rows={rows} rowKey={r => r.id} />
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}

      {confirm && (
        <AdminConfirmDialog
          title={confirm.status === 'removed' ? 'Remove this content?' : 'Restore this content?'}
          body={confirm.status === 'removed' ? 'It will be hidden from the live app. This is reversible.' : undefined}
          destructive={confirm.status === 'removed'}
          confirmLabel={confirm.status === 'removed' ? 'Remove' : 'Restore'}
          onConfirm={handleConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
