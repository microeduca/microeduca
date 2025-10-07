import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';

export function useFavorites() {
  const user = getCurrentUser();
  const key = user ? `fav_${user.id}` : 'fav_guest';
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) setFavoriteIds(JSON.parse(saved));
    } catch {}
  }, [key]);

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(favoriteIds)); } catch {}
  }, [key, favoriteIds]);

  const toggleFavorite = (id: string) => {
    setFavoriteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const isFavorite = (id: string) => favoriteIds.includes(id);

  return { favoriteIds, isFavorite, toggleFavorite };
}


