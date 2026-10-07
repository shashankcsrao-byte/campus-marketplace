import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { addFavorite, getFavoriteIds, removeFavorite } from '../services/favoriteService';
import { toUserMessage } from '../utils/errorMessages';

interface FavoritesContextValue {
  ids: Set<string>;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const userId = user?.id;

  // Load once per login.
  useEffect(() => {
    let active = true;
    setIds(new Set());
    if (!userId) return;
    getFavoriteIds()
      .then((list) => active && setIds(new Set(list)))
      .catch((err) => console.warn('Could not load favourites', err));
    return () => {
      active = false;
    };
  }, [userId]);

  const toggle = useCallback(
    async (id: string) => {
      const wasFav = ids.has(id);
      const flip = (add: boolean) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (add) next.add(id);
          else next.delete(id);
          return next;
        });

      flip(!wasFav); // optimistic
      try {
        if (wasFav) await removeFavorite(id);
        else await addFavorite(id);
      } catch (err) {
        flip(wasFav); // undo
        showToast(toUserMessage(err), 'error');
      }
    },
    [ids, showToast],
  );

  const value = useMemo(() => ({ ids, isFavorite: (id: string) => ids.has(id), toggle }), [ids, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>');
  return ctx;
}
