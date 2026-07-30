import { useState } from 'react';
import { useNavigate } from 'react-router';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { getCreator, type MockCreator } from '../data/creators';
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

  return (
    <>
      {/* Mobile toggle — same floating-action-button treatment as the app's other FABs */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-24 right-4 w-14 h-14 bg-[#7CFFB2] text-black rounded-full shadow-lg hover:bg-[#6EEEA8] transition-all flex items-center justify-center z-30"
        aria-label="Open my creators and watchlist"
      >
        <MenuIcon sx={{ fontSize: 22 }} />
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:z-auto lg:flex-shrink-0 lg:h-full lg:overflow-x-hidden
          ${isExpanded ? 'lg:w-60' : 'lg:w-12'}`}
      >
        {/* Mobile-only header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 lg:hidden">
          <span className="font-bold text-lg">My Lists</span>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Desktop-only collapse/expand toggle */}
        <div className={`hidden lg:flex items-center border-b border-gray-200 py-3 ${isExpanded ? 'justify-end px-2' : 'justify-center px-0'}`}>
          <button
            onClick={() => setIsExpanded(v => !v)}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
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
              <span className="text-xs text-gray-400">{myCreators.length}</span>
            </div>
            {myCreators.length === 0 ? (
              <p className={`text-xs text-gray-500 ${isExpanded ? '' : 'lg:hidden'}`}>Follow creators to see them here.</p>
            ) : (
              <div className="space-y-1">
                {myCreators.map(creator => {
                  const isSelected = selectedCreatorId === creator.id;
                  return (
                    <button
                      key={creator.id}
                      onClick={() => handleSelectCreator(creator.id)}
                      title={!isExpanded ? creator.name : undefined}
                      className={`w-full flex items-center gap-2.5 py-2 rounded-full text-left hover:bg-gray-100 transition-colors ${
                        isExpanded ? 'px-2.5' : 'px-2.5 lg:px-0 lg:justify-center'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm flex-shrink-0">
                        {creator.avatar}
                      </div>
                      <span className={`flex-1 min-w-0 text-sm truncate ${isSelected ? 'font-semibold text-brand' : 'font-medium text-gray-800'} ${isExpanded ? '' : 'lg:hidden'}`}>
                        {creator.name}
                      </span>
                      <span className={`flex-shrink-0 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium ${isExpanded ? '' : 'lg:hidden'}`}>
                        {creator.tier}
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
              <span className="text-xs text-gray-400">{watchlistItems.length}</span>
            </div>
            {watchlistItems.length === 0 ? (
              <p className={`text-xs text-gray-500 ${isExpanded ? '' : 'lg:hidden'}`}>Save assets to track them here.</p>
            ) : (
              <div className="space-y-1">
                {watchlistItems.map(item => {
                  // Real Supabase watchlist rows don't carry live price data; the guest/mock
                  // fallback dataset does (change1D) — show the indicator only when present.
                  const change = (item as unknown as { change1D?: number }).change1D;
                  const isUp = typeof change === 'number' ? change >= 0 : null;
                  return (
                    <div
                      key={item.id}
                      title={!isExpanded ? item.ticker : undefined}
                      className={`flex items-center gap-2.5 py-2 rounded-full hover:bg-gray-100 transition-colors ${
                        isExpanded ? 'px-2.5' : 'px-2.5 lg:px-0 lg:justify-center'
                      }`}
                    >
                      {/* Collapsed rail: ticker-initial dot standing in for the row */}
                      <div className={`hidden ${isExpanded ? '' : 'lg:flex'} w-8 h-8 rounded-full bg-gray-100 items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0`}>
                        {item.ticker.slice(0, 1)}
                      </div>
                      <span className={`flex-1 min-w-0 text-sm font-medium text-gray-800 truncate ${isExpanded ? '' : 'lg:hidden'}`}>
                        {item.ticker}
                        {item.name ? <span className="text-gray-500 font-normal"> · {item.name}</span> : null}
                      </span>
                      {isUp !== null && (
                        <span className={`flex-shrink-0 flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-brand' : 'text-red-500'} ${isExpanded ? '' : 'lg:hidden'}`}>
                          {isUp ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
                          {isUp ? '+' : ''}{change!.toFixed(1)}%
                        </span>
                      )}
                    </div>
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
