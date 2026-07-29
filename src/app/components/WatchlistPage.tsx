import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import Footer from './Footer';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CloseIcon from '@mui/icons-material/Close';
import ArticleIcon from '@mui/icons-material/Article';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import AddIcon from '@mui/icons-material/Add';
import AppHeader from './AppHeader';
import { getWatchlistPrices, type TickerPrice } from '../../lib/market.service';
// WatchlistItem now sourced from the real DB schema (types/database.ts), not the
// mock shape in data/watchlist.ts — the two used to diverge (camelCase display
// fields like price/change1D/relatedPosts don't exist on the actual table).
import type { WatchlistItem } from '../../types/database';
import { useWatchlist } from '../contexts/WatchlistContext';

export default function WatchlistPage() {
  const navigate = useNavigate();
  const { watchlistItems, removeFromWatchlist, updateItem, addToWatchlist } = useWatchlist();
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [livePrices, setLivePrices] = useState<Map<string, TickerPrice>>(new Map());

  useEffect(() => {
    const tickers = watchlistItems.map(i => i.ticker);
    if (!tickers.length) return;
    getWatchlistPrices(tickers).then(setLivePrices);
  }, [watchlistItems.length]);
  const [editingThesis, setEditingThesis] = useState(false);
  const [editThesisText, setEditThesisText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  // Add Asset form state
  const [newTicker, setNewTicker] = useState('');
  const [newName, setNewName] = useState('');
  const [newAssetType, setNewAssetType] = useState<WatchlistItem['asset_type']>('Stock');

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleRemove = (id: string) => {
    removeFromWatchlist(id);
    setSelectedItem(null);
    triggerToast('Removed from Watchlist');
  };

  const handleSaveThesis = () => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, { thesis: editThesisText });
    setSelectedItem(prev => prev ? { ...prev, thesis: editThesisText } : null);
    setEditingThesis(false);
    triggerToast('Thesis updated');
  };

  const handleAddAsset = () => {
    if (!newTicker.trim()) return;
    const ticker = newTicker.toUpperCase();
    addToWatchlist({
      ticker,
      name: newName || ticker,
      assetType: newAssetType,
      source_type: 'manual',
      source: 'Added manually',
    });
    setNewTicker('');
    setNewName('');
    setNewAssetType('Stock');
    setShowAddModal(false);
    triggerToast(`${ticker} added to Watchlist`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Watching': return 'bg-blue-100 text-blue-700';
      case 'Building Thesis': return 'bg-amber-100 text-amber-700';
      case 'Ready to Act': return 'bg-green-100 text-green-700';
      case 'Reviewing': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getInterestColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-gray-100 text-gray-600';
      case 'Medium': return 'bg-blue-100 text-blue-700';
      case 'High': return 'bg-[#7CFFB2] text-black';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const learningPaths = [
    { title: 'Understand the company', description: 'Research business model, competitive position, and market dynamics', icon: '🏢', action: 'Browse Posts', route: '/main' },
    { title: 'Check valuation', description: 'Use DCF models, comparable analysis, and valuation multiples', icon: '💰', action: 'Explore Models', route: '/models' },
    { title: 'Review risks', description: 'Document assumptions, downside scenarios, and portfolio impact', icon: '⚠️', action: 'Build Thesis', route: '/watchlist' },
    { title: 'Track your thesis', description: 'Monitor catalysts, update assumptions, and refine your conviction', icon: '📊', action: 'View Watchlist', route: '/watchlist' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AppHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-24 lg:pb-12">
          {/* Hero */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-5xl font-bold mb-3 sm:mb-4">Investment Watchlist</h1>
            <p className="text-base sm:text-xl text-gray-600">Track your investment ideas, build structured theses, and move from content to conviction.</p>
          </div>

          {/* Learning Paths */}
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Build your investing logic</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {learningPaths.map((path, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors bg-white">
                  <div className="text-4xl mb-3">{path.icon}</div>
                  <h3 className="font-bold mb-2">{path.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">{path.description}</p>
                  <button onClick={() => navigate(path.route)} className="text-sm font-medium text-[#00a86b] hover:underline">
                    {path.action} →
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Watchlist */}
          {watchlistItems.length > 0 ? (
            <>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Your Watchlist ({watchlistItems.length})</h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-black/80 transition-colors flex items-center gap-2"
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                  Add Asset
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {watchlistItems.map(item => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors bg-white cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold">{item.ticker}</h3>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">{item.asset_type}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{item.name ?? item.ticker}</p>
                      </div>
                      <div className="text-right">
                        {(() => {
                          // watchlist_items has no price/change columns — price is live-only
                          // (Polygon). No 1W change source exists anywhere yet (DB or live API),
                          // so it's omitted rather than shown as fabricated data.
                          const lp = livePrices.get(item.ticker);
                          return (
                            <>
                              <p className="text-xl font-bold">{lp?.price ?? '—'}</p>
                              {lp && (
                                <div className="flex items-center gap-2 text-xs mt-1">
                                  <span className={`flex items-center gap-0.5 ${lp.change1D >= 0 ? 'text-[#00a86b]' : 'text-red-500'}`}>
                                    {lp.change1D >= 0 ? <TrendingUpIcon sx={{ fontSize: 12 }} /> : <TrendingDownIcon sx={{ fontSize: 12 }} />}
                                    {Math.abs(lp.change1D)}% 1D
                                  </span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>{item.status}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getInterestColor(item.interest_level)}`}>{item.interest_level} Interest</span>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">{item.source_label ?? 'Added manually'}</p>
                      <p className="text-xs text-gray-500">Updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}</p>
                    </div>

                    <p className="text-sm text-gray-700 line-clamp-2 mb-4">{item.thesis || 'No thesis yet — click to add one.'}</p>

                    {/* relatedPosts/relatedReels/relatedModels: out of scope for this
                        mock→live refactor — watchlist_items has no aggregate columns for
                        these, so the counts have no data source. Not deleted, just not
                        wired up yet; see QA handoff note. */}

                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                      className="w-full py-2 border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      View Thesis
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-5xl">📊</div>
              <h3 className="text-2xl font-bold mb-2">Start Building Your Watchlist</h3>
              <p className="text-gray-600 mb-8 max-w-md">Save investing ideas from posts, reels, and models to track your thesis and build conviction over time.</p>
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/main')} className="px-6 py-3 bg-black text-white rounded-full hover:bg-black/90 transition-colors">Explore Content</button>
                <button onClick={() => setShowAddModal(true)} className="px-6 py-3 border-2 border-gray-200 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors">Add Asset</button>
              </div>
            </div>
          )}
          <Footer />
        </div>
      </div>

      {/* Thesis Detail Modal */}
      {selectedItem && !editingThesis && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold">{selectedItem.ticker}</h2>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">{selectedItem.asset_type}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedItem.status)}`}>{selectedItem.status}</span>
                </div>
                <p className="text-gray-600">{selectedItem.name ?? selectedItem.ticker}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <CloseIcon sx={{ fontSize: 20 }} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Price Info — live-only (Polygon); no price/change columns on watchlist_items.
                  No 1W change source exists yet, so it's omitted rather than fabricated. */}
              {(() => {
                const lp = livePrices.get(selectedItem.ticker);
                return (
                  <div className="flex items-center flex-wrap gap-4 sm:gap-8 pb-6 border-b border-gray-200">
                    <div><p className="text-sm text-gray-600 mb-1">Current Price</p><p className="text-3xl font-bold">{lp?.price ?? '—'}</p></div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">1D Change</p>
                      <p className={`text-xl font-bold ${lp ? (lp.change1D >= 0 ? 'text-[#00a86b]' : 'text-red-500') : 'text-gray-400'}`}>
                        {lp ? `${lp.change1D >= 0 ? '+' : ''}${lp.change1D}%` : '—'}
                      </p>
                    </div>
                    <div><p className="text-sm text-gray-600 mb-1">Time Horizon</p><p className="text-lg font-medium">{selectedItem.time_horizon}</p></div>
                  </div>
                );
              })()}

              {/* My Thesis */}
              <div>
                <h3 className="font-bold mb-3">My Thesis</h3>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 leading-relaxed">{selectedItem.thesis || 'No thesis written yet.'}</p>
                </div>
              </div>

              {/* Why Watching */}
              {selectedItem.why_watching && (
                <div>
                  <h3 className="font-bold mb-3">Why I'm Watching This</h3>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-gray-700 leading-relaxed">{selectedItem.why_watching}</p>
                  </div>
                </div>
              )}

              {/* Assumptions */}
              {selectedItem.assumptions.length > 0 && (
                <div>
                  <h3 className="font-bold mb-3">Key Assumptions</h3>
                  <ul className="space-y-2">
                    {selectedItem.assumptions.map((a, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#00a86b] mt-0.5">✓</span>
                        <span className="text-gray-700">{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Upside Drivers */}
              {selectedItem.upside_drivers.length > 0 && (
                <div>
                  <h3 className="font-bold mb-3">Upside Drivers</h3>
                  <ul className="space-y-2">
                    {selectedItem.upside_drivers.map((d, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <span className="text-green-600 mt-0.5">↗</span>
                        <span className="text-gray-700">{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Downside Risks */}
              {selectedItem.downside.length > 0 && (
                <div>
                  <h3 className="font-bold mb-3">Downside Risks</h3>
                  <ul className="space-y-2">
                    {selectedItem.downside.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                        <span className="text-red-600 mt-0.5">⚠</span>
                        <span className="text-gray-700">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Content — out of scope for this mock→live refactor.
                  watchlist_items has no relatedPosts/relatedReels/relatedModels
                  columns, so these can no longer show real counts. Kept as a UI
                  shell (not deleted) for a future backend-aggregation pass. */}
              <div>
                <h3 className="font-bold mb-3">Related Content</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <ArticleIcon sx={{ fontSize: 32, color: '#9ca3af', marginBottom: 1 }} />
                    <p className="text-sm text-gray-400 mb-1">Coming soon</p>
                    <p className="text-sm text-gray-600">Posts</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <VideoLibraryIcon sx={{ fontSize: 32, color: '#9ca3af', marginBottom: 1 }} />
                    <p className="text-sm text-gray-400 mb-1">Coming soon</p>
                    <p className="text-sm text-gray-600">Reels</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <InsertChartIcon sx={{ fontSize: 32, color: '#9ca3af', marginBottom: 1 }} />
                    <p className="text-sm text-gray-400 mb-1">Coming soon</p>
                    <p className="text-sm text-gray-600">Models</p>
                  </div>
                </div>
              </div>

              {/* Decision Notes */}
              {selectedItem.decision_notes && (
                <div>
                  <h3 className="font-bold mb-3">Decision Notes</h3>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-gray-700 leading-relaxed">{selectedItem.decision_notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => { setEditThesisText(selectedItem.thesis); setEditingThesis(true); }}
                  className="flex-1 py-3 bg-black text-white rounded-full font-medium hover:bg-black/80 transition-colors"
                >
                  Edit Thesis
                </button>
                <button
                  onClick={() => handleRemove(selectedItem.id)}
                  className="px-6 py-3 border-2 border-red-200 text-red-600 rounded-full font-medium hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Thesis Modal */}
      {selectedItem && editingThesis && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingThesis(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Edit Thesis — {selectedItem.ticker}</h2>
              <button onClick={() => setEditingThesis(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <CloseIcon sx={{ fontSize: 20 }} />
              </button>
            </div>
            <textarea
              value={editThesisText}
              onChange={e => setEditThesisText(e.target.value)}
              rows={8}
              placeholder="Write your investment thesis here..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00a86b] resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={handleSaveThesis} className="flex-1 py-3 bg-black text-white rounded-full font-medium hover:bg-black/80 transition-colors">
                Save Thesis
              </button>
              <button onClick={() => setEditingThesis(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-full font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Add to Watchlist</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <CloseIcon sx={{ fontSize: 20 }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ticker Symbol</label>
                <input
                  type="text"
                  placeholder="e.g., AAPL, BTC, SPY"
                  value={newTicker}
                  onChange={e => setNewTicker(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00a86b]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Company / Asset Name</label>
                <input
                  type="text"
                  placeholder="e.g., Apple Inc."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00a86b]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Asset Type</label>
                <select
                  value={newAssetType}
                  onChange={e => setNewAssetType(e.target.value as WatchlistItem['asset_type'])}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00a86b]"
                >
                  <option value="Stock">Stock</option>
                  <option value="ETF">ETF</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Sector">Sector</option>
                  <option value="Strategy">Strategy</option>
                </select>
              </div>
              <button
                onClick={handleAddAsset}
                disabled={!newTicker.trim()}
                className="w-full py-3 bg-black text-white rounded-full font-medium hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Watchlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#00a86b] text-white px-6 py-4 rounded-xl shadow-lg z-50 animate-slide-up pointer-events-none">
          <p className="font-bold">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}
