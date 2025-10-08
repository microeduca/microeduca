import { useEffect, useState } from 'react';
import { getCategories, getVideos, getViewHistory, getWelcomeVideo, getModules } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

export function useDashboardData(role: 'user' | 'cliente') {
  const user = getCurrentUser();
  const [categories, setCategories] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [viewHistory, setViewHistory] = useState<any[]>([]);
  const [welcomeVideo, setWelcomeVideoState] = useState<any | null>(null);
  const [modulesByCategory, setModulesByCategory] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [c, v, vh, wv] = await Promise.all([
        getCategories(),
        getVideos(),
        getViewHistory(user?.id),
        getWelcomeVideo(role),
      ]);
      setCategories(c);
      setVideos(v);
      setViewHistory(vh);
      setWelcomeVideoState(wv);
      const modMap: Record<string, any[]> = {};
      for (const cat of c) {
        try {
          modMap[cat.id] = await getModules(cat.id);
        } catch {
          modMap[cat.id] = [];
        }
      }
      setModulesByCategory(modMap);
      setIsLoading(false);
    })();
  }, [user?.id, role]);

  return { user, categories, videos, viewHistory, welcomeVideo, modulesByCategory, isLoading };
}



