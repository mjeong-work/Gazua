import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  followCreator,
  unfollowCreator,
  getFollowedCreatorIds,
} from '../../lib/services/follows.service';

// ── Storage keys ──────────────────────────────────────────────────
const LOCAL_FOLLOWS_KEY = 'gazua:local_follows';    // non-UUID (mock creator) slugs
const DB_FOLLOWS_KEY    = 'gazua:db_follows';       // UUID follows cached from Supabase

// ── UUID validation ───────────────────────────────────────────────
/** Returns true when `s` looks like a Supabase/PostgreSQL UUID. */
function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// ── localStorage helpers ──────────────────────────────────────────
function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, ids: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // storage quota exceeded or private-browsing restriction — ignore
  }
}

// ── Types ─────────────────────────────────────────────────────────
interface FollowContextType {
  /**
   * Combined set of all followed creator IDs:
   *  • Supabase-persisted UUIDs (for real DB creators)
   *  • localStorage-persisted slugs/IDs (for mock creators)
   */
  followedIds: Set<string>;
  /** Quick membership test. */
  isFollowing: (creatorId: string) => boolean;
  /**
   * Toggle follow/unfollow.
   *  • UUID + authenticated → Supabase (optimistic, rollback on error)
   *  • non-UUID OR unauthenticated → localStorage only (no rollback)
   * Safe to call without authentication: stores follow locally.
   */
  toggleFollow: (creatorId: string) => Promise<void>;
  /** True while the initial follow list is being fetched from Supabase. */
  isLoading: boolean;
}

// ── Context ───────────────────────────────────────────────────────
const FollowContext = createContext<FollowContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────
export function FollowProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // db set  — UUID follows fetched from (and pushed to) Supabase
  const [dbIds, setDbIds] = useState<Set<string>>(() => readSet(DB_FOLLOWS_KEY));
  // local set — non-UUID slug follows (mock creators), persisted to localStorage
  const [localIds, setLocalIds] = useState<Set<string>>(() => readSet(LOCAL_FOLLOWS_KEY));
  const [isLoading, setIsLoading] = useState(true);

  // ── Derived combined state ─────────────────────────────────────
  // Exposed as followedIds = union of both sets.
  const [followedIds, setFollowedIds] = useState<Set<string>>(
    () => new Set([...readSet(DB_FOLLOWS_KEY), ...readSet(LOCAL_FOLLOWS_KEY)])
  );

  function rebuildFollowedIds(db: Set<string>, local: Set<string>) {
    setFollowedIds(new Set([...db, ...local]));
  }

  // ── Sync DB follows to localStorage cache ──────────────────────
  useEffect(() => {
    writeSet(DB_FOLLOWS_KEY, dbIds);
    rebuildFollowedIds(dbIds, localIds);
  }, [dbIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync local follows to localStorage ────────────────────────
  useEffect(() => {
    writeSet(LOCAL_FOLLOWS_KEY, localIds);
    rebuildFollowedIds(dbIds, localIds);
  }, [localIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load DB follows whenever the authenticated user changes ────
  useEffect(() => {
    if (!user) {
      // Unauthenticated: clear DB cache, keep local slugs.
      setDbIds(new Set());
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getFollowedCreatorIds(user.id).then(({ data, error }) => {
      if (cancelled) return;

      if (error) {
        console.error('[FollowContext] failed to load follows from Supabase:', error);
        // Keep the stale localStorage cache so the UI stays consistent.
        setIsLoading(false);
        return;
      }

      const fresh = new Set(data ?? []);
      setDbIds(fresh);
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── isFollowing ────────────────────────────────────────────────
  const isFollowing = useCallback(
    (creatorId: string) => followedIds.has(creatorId),
    [followedIds],
  );

  // ── toggleFollow ───────────────────────────────────────────────
  const toggleFollow = useCallback(
    async (creatorId: string) => {
      const isDbCreator = isUUID(creatorId);
      const wasFollowing = followedIds.has(creatorId);

      // ── Non-UUID (mock creator slug) → localStorage only ────────
      if (!isDbCreator) {
        setLocalIds(prev => {
          const next = new Set(prev);
          wasFollowing ? next.delete(creatorId) : next.add(creatorId);
          return next;
        });
        return;
      }

      // ── UUID but no authenticated user → persist locally ────────
      if (!user) {
        setLocalIds(prev => {
          const next = new Set(prev);
          wasFollowing ? next.delete(creatorId) : next.add(creatorId);
          return next;
        });
        return;
      }

      // ── UUID + authenticated → Supabase with optimistic update ──

      // Optimistic: update DB set immediately
      setDbIds(prev => {
        const next = new Set(prev);
        wasFollowing ? next.delete(creatorId) : next.add(creatorId);
        return next;
      });

      const { error } = wasFollowing
        ? await unfollowCreator(user.id, creatorId)
        : await followCreator(user.id, creatorId);

      if (error) {
        console.error('[FollowContext] Supabase toggle failed:', error);
        // Rollback the optimistic update
        setDbIds(prev => {
          const next = new Set(prev);
          wasFollowing ? next.add(creatorId) : next.delete(creatorId);
          return next;
        });
      }
    },
    [user, followedIds],
  );

  return (
    <FollowContext.Provider value={{ followedIds, isFollowing, toggleFollow, isLoading }}>
      {children}
    </FollowContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────
export function useFollow() {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error('useFollow must be used inside <FollowProvider>');
  return ctx;
}

// ── Re-export UUID helper for consumers ───────────────────────────
export { isUUID };
