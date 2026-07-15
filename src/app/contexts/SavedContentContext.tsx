import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  getSavedItems,
  saveItem,
  removeItem,
  type SavedContentItem,
  type SavedContentInput,
} from '../../lib/services/savedContent.service';

export type { SavedContentItem, SavedContentInput, SavedContentType, SavedContentSurface } from '../../lib/services/savedContent.service';

// Logged-out users still get functional, persisted saves (matching FollowContext's
// "unauthenticated → localStorage only, not blocked" behavior) — just scoped to a stable
// guest bucket instead of a real user id.
const GUEST_USER_ID = 'guest';

interface SavedContentContextType {
  savedItems: SavedContentItem[];
  isContentSaved: (contentId: string) => boolean;
  /** Saves if not already saved, unsaves if already saved — the single entry point the Save
   * button uses, so it can never produce a duplicate. */
  toggleSavedContent: (item: Omit<SavedContentInput, 'userId'>) => void;
  removeSavedContent: (contentId: string) => void;
}

const SavedContentContext = createContext<SavedContentContextType | undefined>(undefined);

export function SavedContentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? GUEST_USER_ID;

  const [savedItems, setSavedItems] = useState<SavedContentItem[]>([]);

  // Reload whenever the signed-in user changes (e.g. sign in/out on the same device shouldn't
  // leak one user's saves into another's view).
  useEffect(() => {
    let cancelled = false;
    getSavedItems(userId).then(({ data }) => {
      if (!cancelled) setSavedItems(data ?? []);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const isContentSaved = useCallback(
    (contentId: string) => savedItems.some((i) => i.contentId === contentId),
    [savedItems],
  );

  const toggleSavedContent = useCallback(
    (item: Omit<SavedContentInput, 'userId'>) => {
      const alreadySaved = savedItems.some((i) => i.contentId === item.contentId);

      if (alreadySaved) {
        // Optimistic update, mirroring the pattern used by WatchlistContext/FollowContext.
        setSavedItems((prev) => prev.filter((i) => i.contentId !== item.contentId));
        removeItem(userId, item.contentId).then(({ data }) => {
          if (data) setSavedItems(data);
        });
        return;
      }

      const optimisticItem: SavedContentItem = { ...item, userId, savedAt: new Date().toISOString() };
      setSavedItems((prev) => [optimisticItem, ...prev]);
      saveItem({ ...item, userId }).then(({ data }) => {
        if (data) setSavedItems(data);
      });
    },
    [savedItems, userId],
  );

  const removeSavedContent = useCallback(
    (contentId: string) => {
      setSavedItems((prev) => prev.filter((i) => i.contentId !== contentId));
      removeItem(userId, contentId).then(({ data }) => {
        if (data) setSavedItems(data);
      });
    },
    [userId],
  );

  return (
    <SavedContentContext.Provider value={{ savedItems, isContentSaved, toggleSavedContent, removeSavedContent }}>
      {children}
    </SavedContentContext.Provider>
  );
}

export function useSavedContent() {
  const ctx = useContext(SavedContentContext);
  if (!ctx) throw new Error('useSavedContent must be used inside <SavedContentProvider>');
  return ctx;
}
