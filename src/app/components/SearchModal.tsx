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
import { isCreatorVerified } from '../utils/creator';
import VerifiedBadge from './VerifiedBadge';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { searchTickers, type TickerSearchResult } from '../../lib/market.service';

interface SearchModalProps {
  onClose: () => void;
}

const CREATORS_SEARCH_PREFIX = '/creators';

interface CreatorResult {
  kind: 'creator';
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
  route: string;
}

// Real-provider search result (see market.service.ts's searchTickers) — the whole active US
// stock/ETF universe, not a static handful of demo tickers. `kind: 'asset'` distinguishes from
// CreatorResult in the combined result list below — deliberately not named `type` since
// TickerSearchResult already has its own `type` field (Polygon's asset-class code, e.g. 'CS').
interface AssetResult extends TickerSearchResult {
  kind: 'asset';
}

type SearchResult = CreatorResult | AssetResult;

const ASSET_TYPE_LABELS: Record<string, string> = {
  CS: 'Stock', ETF: 'ETF', ETN: 'ETN', ETS: 'ETF',
  ADRC: 'Stock', ADRP: 'Stock', ADRR: 'Stock',
  UNIT: 'Unit', PFD: 'Preferred', RIGHT: 'Right', WARRANT: 'Warrant',
};

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
        kind: 'creator',
        name: p.full_name,
        handle: `@${p.handle ?? p.username}`,
        avatar: p.avatar_url || '👤',
        verified: isCreatorVerified(p),
        route: `/profile/${p.username}/investment`,
      }));
    }
    const trimmed = query.trim();
    const ranked = trimmed ? rankMockCreators(ALL_MOCK_CREATORS, trimmed) : ALL_MOCK_CREATORS;
    return ranked.slice(0, 8).map((c): CreatorResult => ({
      kind: 'creator',
      name: c.name,
      handle: `@${nameToCreatorId(c.name).replace(/-/g, '')}`,
      avatar: c.avatar,
      verified: c.verified,
      route: `/profile/${nameToCreatorId(c.name)}/investment`,
    }));
  }, [dbCreators, query]);

  // Real stock/ETF search (Polygon reference tickers — the full active US universe, not a
  // static list). Only fires once the query is at least 2 characters, to keep request volume
  // reasonable against the provider's free-tier rate limit; the module-level cache in
  // market.service.ts also dedupes identical repeat queries within its TTL.
  const [rawAssetResults, setRawAssetResults] = useState<TickerSearchResult[]>([]);
  const [isSearchingAssets, setIsSearchingAssets] = useState(false);
  const [assetSearchFailed, setAssetSearchFailed] = useState(false);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setRawAssetResults([]);
      setAssetSearchFailed(false);
      setIsSearchingAssets(false);
      return;
    }
    let cancelled = false;
    setIsSearchingAssets(true);
    setAssetSearchFailed(false);
    searchTickers(trimmed, 6).then((results) => {
      if (cancelled) return;
      setIsSearchingAssets(false);
      if (results === null) {
        setAssetSearchFailed(true);
        setRawAssetResults([]);
        return;
      }
      setRawAssetResults(results);
    });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const assetResults: AssetResult[] = useMemo(
    () => rawAssetResults.map((r): AssetResult => ({ ...r, kind: 'asset' })),
    [rawAssetResults],
  );

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
      applyCreatorsPageFilter(result.kind === 'asset' ? result.ticker : result.name);
      return;
    }
    if (result.kind === 'asset') {
      navigate(`/asset/${result.ticker}`);
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
        className="bg-white rounded-md w-full max-w-2xl shadow-2xl overflow-hidden"
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
                  className="w-full p-3 flex items-center gap-3 hover:bg-neutral-50 rounded-md transition-colors text-left"
                >
                  {result.kind === 'creator' ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-xl flex-shrink-0">
                        {result.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{result.name}</span>
                          {result.verified && <VerifiedBadge />}
                        </div>
                        <span className="text-xs text-neutral-500">{result.handle}</span>
                      </div>
                      <span className="text-xs text-neutral-400">Creator</span>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-700">📊</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm block">{result.ticker}</span>
                        <span className="text-xs text-neutral-500 truncate block">{result.name}</span>
                      </div>
                      <span className="text-xs text-neutral-400 flex-shrink-0">{ASSET_TYPE_LABELS[result.type] ?? result.type ?? 'Stock'}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          ) : isSearchingCreators || isSearchingAssets ? (
            <div className="p-12 text-center text-neutral-500">
              <p>Searching...</p>
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-500">
              <SearchIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
              <p className="mt-4">No results found for "{query}"</p>
            </div>
          )}
          {assetSearchFailed && debouncedQuery.trim().length >= 2 && (
            <div className="px-4 py-2 text-xs text-neutral-400 text-center border-t border-neutral-100">
              Stock search is temporarily unavailable.
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
