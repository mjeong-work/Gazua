import { useState } from 'react';
import { useNavigate } from 'react-router';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useWatchlist } from '../contexts/WatchlistContext';
import type { WatchlistItem } from '../../types/database';
import { MOCK_POSTS } from '../data/posts';

function sentimentStyle(s: string) {
  if (s === 'Bullish') return 'bg-green-100 text-green-700';
  if (s === 'Bearish') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-500';
}

function creatorActivityFor(ticker: string) {
  return MOCK_POSTS.filter(p => p.asset === ticker).slice(0, 3);
}

function formatSaved(item: WatchlistItem): string {
  if (item.source_label) return item.source_label;
  if (item.source_type === 'manual') return 'Added manually';
  return `Saved from ${item.source_type}`;
}

export default function WatchingTab() {
  const navigate = useNavigate();
  const { watchlistItems, addToWatchlist, removeFromWatchlist, updateItem, isLoading } = useWatchlist();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<WatchlistItem['asset_type']>('Stock');

  const startEdit = (item: WatchlistItem) => {
    setEditingId(item.id);
    setEditNote(item.thesis ?? '');
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateItem(editingId, { thesis: editNote });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newTicker.trim()) return;
    addToWatchlist({
      ticker: newTicker.trim().toUpperCase(),
      name: newName.trim() || newTicker.trim().toUpperCase(),
      assetType: newType,
      source_type: 'manual',
    });
    setNewTicker('');
    setNewName('');
    setNewType('Stock');
    setShowAddModal(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(n => (
          <div key={n} className="border border-gray-200 rounded-2xl p-5 h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Watching</h2>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Private — only visible to you
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors"
        >
          <AddIcon sx={{ fontSize: 16 }} />
          Add Asset
        </button>
      </div>

      {/* Empty state */}
      {watchlistItems.length === 0 && (
        <div className="border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            📌
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">Nothing tracked yet</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
            Save assets from posts and reels, or add them manually. Only you can see this.
          </p>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors"
            >
              Add Asset
            </button>
            <button
              onClick={() => navigate('/main')}
              className="px-5 py-2 border border-gray-200 text-sm font-medium rounded-full hover:bg-gray-50 transition-colors"
            >
              Browse Content
            </button>
          </div>
        </div>
      )}

      {/* Watchlist items */}
      {watchlistItems.map(item => {
        const activity = creatorActivityFor(item.ticker);
        const isEditing = editingId === item.id;

        return (
          <div key={item.id} className="border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-colors">
            {/* Item header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-lg font-bold text-gray-900">{item.ticker}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                    {item.asset_type}
                  </span>
                  {item.time_horizon && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                      {item.time_horizon}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{item.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatSaved(item)}
                </p>
              </div>
              <button
                onClick={() => removeFromWatchlist(item.id)}
                className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-full transition-colors"
                title="Remove"
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </button>
            </div>

            {/* Inline note */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">My Note</p>
                {!isEditing && (
                  <button
                    onClick={() => startEdit(item)}
                    className="text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    <EditOutlinedIcon sx={{ fontSize: 12 }} />
                  </button>
                )}
              </div>
              {isEditing ? (
                <div>
                  <textarea
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    autoFocus
                    rows={3}
                    placeholder="Write a short note about why you're watching this..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={saveEdit}
                      className="px-3 py-1 bg-black text-white text-xs font-medium rounded-lg hover:bg-black/80 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => startEdit(item)}
                  className={`text-sm cursor-text rounded-lg px-3 py-2 border border-dashed transition-colors hover:border-gray-300 hover:bg-gray-50 ${
                    item.thesis ? 'text-gray-700 border-transparent' : 'text-gray-400 border-gray-200'
                  }`}
                >
                  {item.thesis || 'Click to add a note…'}
                </p>
              )}
            </div>

            {/* Creator activity */}
            {activity.length > 0 ? (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                  Creator Activity
                </p>
                <div className="space-y-2.5">
                  {activity.map(post => (
                    <button
                      key={post.id}
                      onClick={() => navigate('/main')}
                      className="w-full flex items-start gap-3 text-left group"
                    >
                      <span className="text-base flex-shrink-0">{post.avatar}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-gray-700 group-hover:text-black transition-colors">
                            {post.creator}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sentimentStyle(post.sentiment)}`}>
                            {post.sentiment}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">{post.content}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400">No recent creator activity for {item.ticker}.</p>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">Add to Watching</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <CloseIcon sx={{ fontSize: 18 }} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ticker Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. AAPL, BTC, SPY"
                  value={newTicker}
                  onChange={e => setNewTicker(e.target.value.toUpperCase())}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 font-mono"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Apple Inc."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as WatchlistItem['asset_type'])}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  <option value="Stock">Stock</option>
                  <option value="ETF">ETF</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Sector">Sector</option>
                  <option value="Strategy">Strategy</option>
                </select>
              </div>
              <button
                onClick={handleAdd}
                disabled={!newTicker.trim()}
                className="w-full py-2.5 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add to Watching
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
