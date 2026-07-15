import type { ReactNode } from 'react';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

export interface AdminDataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  className?: string;
}

interface AdminDataTableProps<T> {
  columns: AdminDataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
}

// Generic sortable table shell used by Users/Reports/Content/AuditLog — plain Tailwind
// (rounded-xl bordered card, gray-50 header, hover:bg-gray-50 rows), not ui/table.tsx.
export default function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  sortBy,
  sortDir,
  onSort,
  onRowClick,
}: AdminDataTableProps<T>) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map(col => (
              <th
                key={col.key}
                className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${col.className ?? ''} ${
                  col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''
                }`}
                onClick={col.sortable ? () => onSort?.(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortBy === col.key && (
                    sortDir === 'asc'
                      ? <ArrowUpwardIcon sx={{ fontSize: 12 }} />
                      : <ArrowDownwardIcon sx={{ fontSize: 12 }} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-gray-100 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
            >
              {columns.map(col => (
                <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
