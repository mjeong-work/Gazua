import { useState } from 'react';
import { useNavigate } from 'react-router';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { getCreator, CREDIBILITY_LEVEL_LABELS, type MockCreator } from '../data/creators';
import { useFollow } from '../contexts/FollowContext';
import { useWatchlist } from '../contexts/WatchlistContext';

export default function CreatorsSidebar() {
  const navigate = useNavigate();
  const { followedIds } = useFollow();
  const { watchlistItems } = useWatchlist();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);

  const myCreators = [...followedIds]
    .map(id => getCreator(id))
    .filter((c): c is MockCreator => c !== null);

  const handleSelectCreator = (id: string) => {
    setSelectedCreatorId(id);
    setIsOpen(false);
    navigate(`/profile/${id}/investment`);
  };

  // There's no standalone single-post page in this app (posts only render inline in the main
  // feed) and WatchlistItem doesn't carry the source creator, so "go to the original post"
  // resolves to the same ticker-filtered feed view every $TICKER badge elsewhere navigates to
  // (e.g. MainPagePosting's asset badge) — the closest real destination for "show me the
  // content behind this watchlist entry" with the data actually available on the row.
  const handleSelectWatchlistItem = (ticker: string) => {
    setIsOpen(false);
    navigate(`/main?ticker=${encodeURIComponent(ticker)}`);
  };

  return (
    <>
      {/* Mobile toggle — same floating-action-button treatment as the app's other FABs */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-24 right-4 w-14 h-14 bg-mint text-black rounded-full shadow-lg hover:bg-mint-hover transition-all flex items-center justify-center z-30"
        aria-label="Open my creators and watchlist"
      >
        <MenuIcon sx={{ fontSize: 22 }} />
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-neutral-200 overflow-y-auto transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:z-auto lg:flex-shrink-0 lg:h-full lg:overflow-x-hidden
          ${isExpanded ? 'lg:w-60' : 'lg:w-12'}`}
      >
        {/* Mobile-only header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-200 lg:hidden">
          <span className="font-bold text-lg">My Lists</span>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Desktop-only collapse/expand toggle */}
        <div className={`hidden lg:flex items-center border-b border-neutral-200 py-3 ${isExpanded ? 'justify-end px-2' : 'justify-center px-0'}`}>
          <button
            onClick={() => setIsExpanded(v => !v)}
            className="icon-tap-target p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? <ChevronLeftIcon sx={{ fontSize: 18 }} /> : <ChevronRightIcon sx={{ fontSize: 18 }} />}
          </button>
        </div>

        <div className={`space-y-6 transition-all duration-300 ${isExpanded ? 'p-4 lg:p-4' : 'p-4 lg:px-1.5 lg:py-4'}`}>
          {/* ── My Creators ── */}
          <div>
            <div className={`flex items-center justify-between mb-3 ${isExpanded ? '' : 'lg:hidden'}`}>
              <h2 className="text-base font-semibold">My Creators</h2>
              <span className="text-xs text-neutral-400">{myCreators.length}</span>
            </div>
            {myCreators.length === 0 ? (
              <p className={`text-xs text-neutral-500 ${isExpanded ? '' : 'lg:hidden'}`}>Follow creators to see them here.</p>
            ) : (
              <div className="space-y-1">
                {myCreators.map(creator => {
                  const isSelected = selectedCreatorId === creator.id;
                  return (
                    <button
                      key={creator.id}
                      onClick={() => handleSelectCreator(creator.id)}
                      title={!isExpanded ? creator.name : undefined}
                      className={`w-full flex items-center gap-2.5 py-2 rounded-sm text-left hover:bg-neutral-100 transition-colors ${
                        isExpanded ? 'px-2.5' : 'px-2.5 lg:px-0 lg:justify-center'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm flex-shrink-0">
                        {creator.avatar}
                      </div>
                      <span className={`flex-1 min-w-0 text-sm truncate ${isSelected ? 'font-semibold text-brand' : 'font-medium text-neutral-800'} ${isExpanded ? '' : 'lg:hidden'}`}>
                        {creator.name}
                      </span>
                      <span className={`flex-shrink-0 px-3 py-1 bg-neutral-100 text-neutral-700 rounded-sm text-xs font-medium ${isExpanded ? '' : 'lg:hidden'}`}>
                        {CREDIBILITY_LEVEL_LABELS[creator.credibilityLevel]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── My Watchlist ── */}
          <div>
            <div className={`flex items-center justify-between mb-3 ${isExpanded ? '' : 'lg:hidden'}`}>
              <h2 className="text-base font-semibold">My Watchlist</h2>
              <span className="text-xs text-neutral-400">{watchlistItems.length}</span>
            </div>
            {watchlistItems.length === 0 ? (
              <p className={`text-xs text-neutral-500 ${isExpanded ? '' : 'lg:hidden'}`}>Save assets to track them here.</p>
            ) : (
              <div className="space-y-1">
                {watchlistItems.map(item => {
                  // Real Supabase watchlist rows don't carry live price data; the guest/mock
                  // fallback dataset does (change1D) — show the indicator only when present.
                  const change = (item as unknown as { change1D?: number }).change1D;
                  const isUp = typeof change === 'number' ? change >= 0 : null;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectWatchlistItem(item.ticker)}
                      title={!isExpanded ? item.ticker : undefined}
                      className={`w-full flex items-center gap-2.5 py-2 rounded-sm text-left hover:bg-neutral-100 transition-colors ${
                        isExpanded ? 'px-2.5' : 'px-2.5 lg:px-0 lg:justify-center'
                      }`}
                    >
                      {/* Collapsed rail: ticker-initial dot standing in for the row */}
                      <div className={`hidden ${isExpanded ? '' : 'lg:flex'} w-8 h-8 rounded-full bg-neutral-100 items-center justify-center text-xs font-semibold text-neutral-600 flex-shrink-0`}>
                        {item.ticker.slice(0, 1)}
                      </div>
                      <span className={`flex-1 min-w-0 text-sm font-medium text-neutral-800 truncate ${isExpanded ? '' : 'lg:hidden'}`}>
                        {item.ticker}
                        {item.name ? <span className="text-neutral-500 font-normal"> · {item.name}</span> : null}
                      </span>
                      {isUp !== null && (
                        <span className={`flex-shrink-0 flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-brand' : 'text-red-500'} ${isExpanded ? '' : 'lg:hidden'}`}>
                          {isUp ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
                          {isUp ? '+' : ''}{change!.toFixed(1)}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
