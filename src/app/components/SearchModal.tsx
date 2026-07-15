import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

interface SearchModalProps {
  onClose: () => void;
}

export default function SearchModal({ onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState('');

  const mockResults = [
    { type: 'creator', name: 'Alex Rodriguez', handle: '@alexrodriguez', avatar: '👨‍💼', verified: true, route: '/profile/alex-rodriguez/investment' },
    { type: 'creator', name: 'Sarah Chen', handle: '@sarahchen', avatar: '👩‍💼', verified: true, route: '/profile/sarah-chen/investment' },
    { type: 'creator', name: 'Mike Ross', handle: '@mikeross', avatar: '👨‍💻', verified: true, route: '/profile/mike-ross/investment' },
    { type: 'creator', name: 'Emma Wilson', handle: '@emmawilson', avatar: '👩‍🔬', verified: false, route: '/profile/emma-wilson/investment' },
    { type: 'creator', name: 'David Park', handle: '@davidpark', avatar: '👨‍🎓', verified: true, route: '/profile/david-park/investment' },
    { type: 'creator', name: 'Lisa Zhang', handle: '@lisazhang', avatar: '👩‍💼', verified: true, route: '/profile/lisa-zhang/investment' },
    { type: 'creator', name: 'James Lee', handle: '@jameslee', avatar: '👨‍💼', verified: true, route: '/profile/james-lee/investment' },
    { type: 'stock', name: 'NVDA', description: 'Nvidia Corporation', route: '/main?ticker=NVDA' },
    { type: 'stock', name: 'TSLA', description: 'Tesla Inc.', route: '/main?ticker=TSLA' },
    { type: 'stock', name: 'SPY', description: 'S&P 500 ETF', route: '/main?ticker=SPY' },
    { type: 'stock', name: 'QQQ', description: 'Nasdaq 100 ETF', route: '/main?ticker=QQQ' },
    { type: 'crypto', name: 'BTC', description: 'Bitcoin', route: '/main?ticker=BTC' },
    { type: 'crypto', name: 'ETH', description: 'Ethereum', route: '/main?ticker=ETH' },
  ];

  const filteredResults = query.trim()
    ? mockResults.filter(result =>
        result.name.toLowerCase().includes(query.toLowerCase()) ||
        (result.description && result.description.toLowerCase().includes(query.toLowerCase()))
      )
    : mockResults;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleResultClick = (result: typeof mockResults[0]) => {
    if (result.type === 'stock' || result.type === 'crypto') {
      const base = pathname.startsWith('/main') ? pathname.split('?')[0] : '/main';
      navigate(`${base}?ticker=${result.name}`);
    } else {
      navigate(result.route);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          <SearchIcon sx={{ fontSize: 24, color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search creators, stocks, topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 text-lg outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredResults.length > 0 ? (
            <div className="p-2">
              {filteredResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleResultClick(result)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  {result.type === 'creator' ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl flex-shrink-0">
                        {result.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{result.name}</span>
                          {result.verified && (
                            <svg className="w-4 h-4 text-[#00a86b]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{result.handle}</span>
                      </div>
                      <span className="text-xs text-gray-400">Creator</span>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-700">
                          {result.type === 'stock' ? '📊' : result.type === 'crypto' ? '₿' : '📚'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-sm block">{result.name}</span>
                        <span className="text-xs text-gray-500">{result.description}</span>
                      </div>
                      <span className="text-xs text-gray-400 capitalize">{result.type}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <SearchIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
              <p className="mt-4">No results found for "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 text-xs text-gray-500 text-center">
          Press <kbd className="px-2 py-1 bg-gray-100 rounded">ESC</kbd> to close
        </div>
      </div>
    </div>
  );
}
