import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  getWatchlistItems,
  addWatchlistItem as dbAdd,
  updateWatchlistItem as dbUpdate,
  removeWatchlistItem as dbRemove,
  removeWatchlistItemBySource as dbRemoveBySource,
} from '../../lib/services/watchlist.service';
import { type WatchlistItem, type WatchlistSourceType } from '../../types/database';
import { MOCK_WATCHLIST_ITEMS } from '../data/watchlist';

export { categoryToAssetType } from '../data/watchlist';

export interface AddToWatchlistPayload {
  ticker: string;
  name?: string;
  assetType?: WatchlistItem['asset_type'];
  source_type: WatchlistSourceType;
  /** Real Supabase UUID of the source post/reel/model — omit for mock (non-DB-backed) content. */
  source_content_id?: string;
  source?: string;
}

interface WatchlistContextType {
  watchlistItems: WatchlistItem[];
  addToWatchlist: (payload: AddToWatchlistPayload) => void;
  removeFromWatchlist: (id: string) => void;
  removeBySource: (source_type: WatchlistSourceType, source_content_id: string | undefined) => void;
  updateItem: (id: string, updates: Partial<WatchlistItem>) => void;
  isSaved: (source_type: WatchlistSourceType, source_content_id: string | undefined) => boolean;
  isLoading: boolean;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Re-fetch whenever the authenticated user changes.
  useEffect(() => {
    const uid = user?.id ?? null;
    userIdRef.current = uid;

    if (uid) {
      fetchFromSupabase(uid);
    } else {
      setWatchlistItems(MOCK_WATCHLIST_ITEMS as unknown as WatchlistItem[]);
    }
  }, [user?.id]);

  const fetchFromSupabase = async (userId: string) => {
    setIsLoading(true);
    const { data, error } = await getWatchlistItems(userId);
    setIsLoading(false);
    if (error || !data) {
      setWatchlistItems(MOCK_WATCHLIST_ITEMS as unknown as WatchlistItem[]);
      return;
    }
    setWatchlistItems(data);
  };

  const addToWatchlist = (payload: AddToWatchlistPayload) => {
    const uid = userIdRef.current;
    const ticker = payload.ticker.toUpperCase();
    const srcId = payload.source_content_id;

    const alreadySaved = watchlistItems.some(item =>
      srcId
        ? item.source_type === payload.source_type && item.source_content_id === srcId
        : item.ticker === ticker
    );
    if (alreadySaved) return;

    const optimisticItem: WatchlistItem = {
      id: `optimistic-${Date.now()}`,
      user_id: uid ?? 'guest',
      ticker,
      name: payload.name ?? ticker,
      asset_type: payload.assetType ?? 'Strategy',
      interest_level: 'Medium',
      status: 'Watching',
      time_horizon: 'Medium-term',
      source_type: payload.source_type,
      source_content_id: srcId ?? null,
      source_label: payload.source ?? `Saved from ${payload.source_type}`,
      thesis: '',
      why_watching: '',
      assumptions: [],
      upside_drivers: [],
      downside: [],
      decision_notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setWatchlistItems(prev => [optimisticItem, ...prev]);

    if (uid) {
      dbAdd(uid, {
        ticker,
        name: payload.name ?? ticker,
        asset_type: payload.assetType ?? 'Strategy',
        source_type: payload.source_type,
        source_content_id: srcId,
        source_label: payload.source,
      }).then(({ data: saved, error }) => {
        if (error || !saved) return;
        setWatchlistItems(prev =>
          prev.map(item => item.id === optimisticItem.id ? saved : item)
        );
      });
    }
  };

  const removeFromWatchlist = (id: string) => {
    const uid = userIdRef.current;
    setWatchlistItems(prev => prev.filter(item => item.id !== id));
    if (uid && !id.startsWith('optimistic-')) {
      dbRemove(id, uid).catch(() => {});
    }
  };

  const removeBySource = (source_type: WatchlistSourceType, source_content_id: string | undefined) => {
    if (!source_content_id) return;
    const uid = userIdRef.current;
    setWatchlistItems(prev =>
      prev.filter(item =>
        !(item.source_type === source_type && item.source_content_id === source_content_id)
      )
    );
    if (uid) {
      dbRemoveBySource(uid, source_type, source_content_id).catch(() => {});
    }
  };

  const updateItem = (id: string, updates: Partial<WatchlistItem>) => {
    const uid = userIdRef.current;
    setWatchlistItems(prev =>
      prev.map(item => item.id === id ? { ...item, ...updates } : item)
    );
    if (uid && !id.startsWith('optimistic-')) {
      dbUpdate(id, uid, updates).catch(() => {});
    }
  };

  const isSaved = (source_type: WatchlistSourceType, source_content_id: string | undefined): boolean => {
    if (!source_content_id) return false;
    return watchlistItems.some(
      item => item.source_type === source_type && item.source_content_id === source_content_id
    );
  };

  return (
    <WatchlistContext.Provider
      value={{ watchlistItems, addToWatchlist, removeFromWatchlist, removeBySource, updateItem, isSaved, isLoading }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within a WatchlistProvider');
  return ctx;
}
