import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { listUsers } from '../../../lib/services/adminUsers.service';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import AdminSearchFilterBar from './AdminSearchFilterBar';
import AdminDataTable, { type AdminDataTableColumn } from './AdminDataTable';
import AdminStatusBadge from './AdminStatusBadge';
import AdminPagination from './AdminPagination';
import AdminLoadingSkeleton from './AdminLoadingSkeleton';
import AdminEmptyState from './AdminEmptyState';
import AdminErrorState from './AdminErrorState';
import type { AdminRole, AdminUserListItem, SortDirection, UserStatus } from '../../../types/admin';

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [roleFilter, setRoleFilter] = useState<AdminRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<'created_at' | 'username' | 'full_name'>('created_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const [rows, setRows] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await listUsers({
      search: debouncedSearch,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      sortBy,
      sortDir,
      page,
      pageSize: PAGE_SIZE,
    });
    if (err || !data) {
      setError(true);
    } else {
      setRows(data.rows);
      setTotal(data.total);
    }
    setLoading(false);
  }, [debouncedSearch, roleFilter, statusFilter, sortBy, sortDir, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [debouncedSearch, roleFilter, statusFilter]);

  const handleSort = (key: string) => {
    if (key !== 'created_at' && key !== 'username' && key !== 'full_name') return;
    if (sortBy === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  };

  const columns: AdminDataTableColumn<AdminUserListItem>[] = [
    {
      key: 'full_name',
      label: 'User',
      sortable: true,
      render: u => (
        <div>
          <p className="font-medium text-sm">{u.full_name}</p>
          <p className="text-xs text-neutral-400">@{u.username}</p>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: u => <AdminStatusBadge status={u.role} /> },
    { key: 'status', label: 'Status', render: u => <AdminStatusBadge status={u.status} /> },
    { key: 'is_creator', label: 'Creator', render: u => (u.is_creator ? 'Yes' : '—') },
    {
      key: 'created_at',
      label: 'Joined',
      sortable: true,
      render: u => <span className="text-neutral-500">{new Date(u.created_at).toLocaleDateString()}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-neutral-500 mt-1">{total.toLocaleString()} total.</p>
      </div>

      <AdminSearchFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or username…"
        filters={[
          {
            key: 'role',
            value: roleFilter,
            onChange: v => setRoleFilter(v as AdminRole | ''),
            options: [
              { value: '', label: 'All roles' },
              { value: 'admin', label: 'Admin' },
              { value: 'user', label: 'User' },
            ],
          },
          {
            key: 'status',
            value: statusFilter,
            onChange: v => setStatusFilter(v as UserStatus | ''),
            options: [
              { value: '', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'warned', label: 'Warned' },
              { value: 'suspended', label: 'Suspended' },
            ],
          },
        ]}
      />

      {loading ? (
        <AdminLoadingSkeleton />
      ) : error ? (
        <AdminErrorState onRetry={load} />
      ) : rows.length === 0 ? (
        <AdminEmptyState message="No users match your filters." />
      ) : (
        <>
          <AdminDataTable
            columns={columns}
            rows={rows}
            rowKey={u => u.id}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={u => navigate(`/admin/users/${u.id}`)}
          />
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
