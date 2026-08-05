import { useState, useEffect, useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { getCreators, searchCreators as searchCreatorsDb } from '../../lib/services/profiles.service';
import type { Profile } from '../../types/database';
import {
  nameToCreatorId,
  FEATURED_CREATORS,
  TRENDING_CREATORS,
  BEGINNER_EDUCATORS,
  QUANT_BUILDERS,
  STOCK_PICKERS,
  CRYPTO_VOICES,
  RETIREMENT_EXPERTS,
} from '../data/creators';
import { searchCreators as rankMockCreators } from '../utils/creatorSearch';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface SearchModalProps {
  onClose: () => void;
}

const CREATORS_SEARCH_PREFIX = '/creators';

interface CreatorResult {
  type: 'creator';
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
  route: string;
}

interface AssetResult {
  type: 'stock' | 'crypto';
  name: string;
  description: string;
  route: string;
}

type SearchResult = CreatorResult | AssetResult;

// Static — every ticker the app actually supports live data/charts for (see marketData.ts /
// market.service.ts), so unlike creators this list isn't an incomplete subset of a larger table.
const ASSET_RESULTS: AssetResult[] = [
  { type: 'stock', name: 'NVDA', description: 'Nvidia Corporation', route: '/main?ticker=NVDA' },
  { type: 'stock', name: 'TSLA', description: 'Tesla Inc.', route: '/main?ticker=TSLA' },
  { type: 'stock', name: 'SPY', description: 'S&P 500 ETF', route: '/main?ticker=SPY' },
  { type: 'stock', name: 'QQQ', description: 'Nasdaq 100 ETF', route: '/main?ticker=QQQ' },
  { type: 'crypto', name: 'BTC', description: 'Bitcoin', route: '/main?ticker=BTC' },
  { type: 'crypto', name: 'ETH', description: 'Ethereum', route: '/main?ticker=ETH' },
];

// Full mock creator catalog (same source CreatorsPage uses) — fallback only for when Supabase
// is unreachable/unconfigured, so search still covers every creator instead of a hardcoded 7.
const ALL_MOCK_CREATORS = [
  ...FEATURED_CREATORS,
  ...TRENDING_CREATORS,
  ...BEGINNER_EDUCATORS,
  ...QUANT_BUILDERS,
  ...STOCK_PICKERS,
  ...CRYPTO_VOICES,
  ...RETIREMENT_EXPERTS,
];

export default function SearchModal({ onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isOnCreatorsPage = pathname.startsWith(CREATORS_SEARCH_PREFIX);
  const [searchParams, setSearchParams] = useSearchParams();
  // On the Creators page, this modal's query doubles as that page's live filter (synced to
  // ?q= below) — so if it's reopened there, pick up whatever filter is already active rather
  // than starting blank. Every other page is unaffected; query still starts empty there.
  const [query, setQuery] = useState(() => (isOnCreatorsPage ? searchParams.get('q') ?? '' : ''));

  // Debounced ?q= sync — scoped entirely to the Creators page. Nowhere else reads this param,
  // so this has no effect on search behavior anywhere else in the app.
  useEffect(() => {
    if (!isOnCreatorsPage) return;
    const id = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const trimmed = query.trim();
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      setSearchParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isOnCreatorsPage]);

  // Real creator search against Supabase (profiles table), debounced so it doesn't fire on
  // every keystroke. null = not yet resolved / Supabase unreachable -> use the full local mock
  // creator catalog below instead of the old hardcoded 7-name subset.
  const debouncedQuery = useDebouncedValue(query, 250);
  const [dbCreators, setDbCreators] = useState<Profile[] | null>(null);
  const [isSearchingCreators, setIsSearchingCreators] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsSearchingCreators(true);
    const trimmed = debouncedQuery.trim();
    const request = trimmed ? searchCreatorsDb(trimmed, 8) : getCreators({ limit: 8 });
    request.then(({ data, error }) => {
      if (cancelled) return;
      setDbCreators(error || !data ? null : data);
      setIsSearchingCreators(false);
    });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const creatorResults: CreatorResult[] = useMemo(() => {
    if (dbCreators !== null) {
      return dbCreators.map((p): CreatorResult => ({
        type: 'creator',
        name: p.full_name,
        handle: `@${p.handle ?? p.username}`,
        avatar: p.avatar_url || '👤',
        verified: p.is_verified,
        route: `/profile/${p.username}/investment`,
      }));
    }
    const trimmed = query.trim();
    const ranked = trimmed ? rankMockCreators(ALL_MOCK_CREATORS, trimmed) : ALL_MOCK_CREATORS;
    return ranked.slice(0, 8).map((c): CreatorResult => ({
      type: 'creator',
      name: c.name,
      handle: `@${nameToCreatorId(c.name).replace(/-/g, '')}`,
      avatar: c.avatar,
      verified: c.verified,
      route: `/profile/${nameToCreatorId(c.name)}/investment`,
    }));
  }, [dbCreators, query]);

  const assetResults: AssetResult[] = query.trim()
    ? ASSET_RESULTS.filter(result =>
        result.name.toLowerCase().includes(query.toLowerCase()) ||
        result.description.toLowerCase().includes(query.toLowerCase())
      )
    : ASSET_RESULTS;

  const filteredResults: SearchResult[] = [...creatorResults, ...assetResults];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Applies the current query as the Creators page's own filter (?q=, same pathname, no
  // navigation) instead of following the global search redirect. Shared by both the Enter key
  // and clicking a result while on /creators, since neither should ever leave this page.
  const applyCreatorsPageFilter = (term: string) => {
    const next = new URLSearchParams(searchParams);
    const trimmed = term.trim();
    if (trimmed) next.set('q', trimmed);
    else next.delete('q');
    setSearchParams(next, { replace: true });
    onClose();
  };

  const handleResultClick = (result: SearchResult) => {
    if (isOnCreatorsPage) {
      applyCreatorsPageFilter(result.name);
      return;
    }
    if (result.type === 'stock' || result.type === 'crypto') {
      const base = pathname.startsWith('/main') ? pathname.split('?')[0] : '/main';
      navigate(`${base}?ticker=${result.name}`);
    } else {
      navigate(result.route);
    }
    onClose();
  };

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    // Every other route keeps its prior behavior exactly — there was no Enter handling before,
    // so none is added here; only /creators gets submit-to-filter behavior.
    if (!isOnCreatorsPage) return;
    e.preventDefault();
    applyCreatorsPageFilter(query);
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
        <div className="p-4 border-b border-neutral-200 flex items-center gap-3">
          <SearchIcon sx={{ fontSize: 24, color: 'var(--icon-muted)' }} />
          <input
            type="text"
            placeholder="Search creators, stocks, topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            autoFocus
            className="flex-1 text-lg outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-full transition-colors"
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
                  className="w-full p-3 flex items-center gap-3 hover:bg-neutral-50 rounded-lg transition-colors text-left"
                >
                  {result.type === 'creator' ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-xl flex-shrink-0">
                        {result.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{result.name}</span>
                          {result.verified && (
                            <svg className="w-4 h-4 text-brand" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-neutral-500">{result.handle}</span>
                      </div>
                      <span className="text-xs text-neutral-400">Creator</span>
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
                        <span className="text-xs text-neutral-500">{result.description}</span>
                      </div>
                      <span className="text-xs text-neutral-400 capitalize">{result.type}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          ) : isSearchingCreators ? (
            <div className="p-12 text-center text-neutral-500">
              <p>Searching...</p>
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-500">
              <SearchIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
              <p className="mt-4">No results found for "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200 text-xs text-neutral-500 text-center">
          Press <kbd className="px-2 py-1 bg-neutral-100 rounded">ESC</kbd> to close
        </div>
      </div>
    </div>
  );
}
