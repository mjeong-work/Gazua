import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface AdminPaginationProps {
  page: number; // 0-indexed
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function AdminPagination({ page, pageSize, total, onPageChange }: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-gray-400">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon sx={{ fontSize: 18 }} />
        </button>
        <span className="text-xs font-medium text-gray-600 px-1">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          aria-label="Next page"
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon sx={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}
