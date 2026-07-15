import SearchIcon from '@mui/icons-material/Search';

export interface AdminFilterGroup {
  key: string;
  options: { value: string; label: string }[];
  value: string; // '' = "all" / no filter
  onChange: (value: string) => void;
}

interface AdminSearchFilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: AdminFilterGroup[];
}

// Echoes ModerationPage.tsx's pending/all pill-toggle styling, generalized into a reusable
// search input + N filter-pill-groups row shared by every admin list page.
export default function AdminSearchFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
}: AdminSearchFilterBarProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
      {onSearchChange && (
        <div className="relative flex-1 lg:max-w-xs">
          <SearchIcon sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#9ca3af' }} />
          <input
            type="text"
            value={search ?? ''}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-gray-400 transition-colors"
          />
        </div>
      )}

      {filters.map(group => (
        <div key={group.key} className="flex gap-2 flex-wrap">
          {group.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => group.onChange(opt.value)}
              className={`px-4 py-2 text-xs font-medium rounded-full border transition-colors capitalize ${
                group.value === opt.value
                  ? 'bg-black text-white border-black'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
