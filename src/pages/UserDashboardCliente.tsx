import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import SupportFilesList from '@/components/SupportFilesList';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, CheckCircle, BookOpen, TrendingUp } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getCategories, getVideos, getViewHistory, getWelcomeVideo } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';

export default function UserDashboardCliente() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [viewHistory, setViewHistory] = useState<any[]>([]);
  const [welcomeVideo, setWelcomeVideoState] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [c, v, vh, wv] = await Promise.all([
        getCategories(),
        getVideos(),
        getViewHistory(user?.id),
        getWelcomeVideo('cliente'),
      ]);
      setCategories(c);
      setVideos(v);
      setViewHistory(vh);
      setWelcomeVideoState(wv);
      setIsLoading(false);
    })();
  }, [user?.id]);

  const allowedCategoryIds = new Set<string>(user?.assignedCategories || []);
  const visibleVideos = videos.filter(v => allowedCategoryIds.has((v.categoryId || (v as any).category_id) as string));

  const stats = {
    totalVideos: visibleVideos.length,
    watchedVideos: viewHistory.filter(h => h.completed).length,
    inProgress: viewHistory.filter(h => !h.completed).length,
  };

  const inProgressVideos = viewHistory
    .map(h => {
      const vid = visibleVideos.find(v => v.id === h.videoId);
      const total = vid?.duration || 0;
      const raw = total > 0 ? (h.watchedDuration / total) * 100 : (h.completed ? 100 : 0);
      const clamped = Math.max(0, Math.min(100, raw));
      return { video: vid, progress: clamped, completed: !!h.completed };
    })
    .filter(item => item.video && !item.completed && item.progress < 100);

  const handleVideoClick = (videoId: string) => navigate(`/video/${videoId}`);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-poppins font-bold mb-2">Bem-vindo, {user?.name}!</h1>
          <p className="text-muted-foreground">Conteúdo exclusivo para clientes</p>
        </div>

        {/* Vídeo de boas‑vindas configurável */}
        {welcomeVideo?.url && (
          <div className="rounded-lg overflow-hidden bg-muted">
            <div className="aspect-video">
              <iframe
                src={welcomeVideo.url}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={welcomeVideo.title || 'Boas‑vindas'}
              />
            </div>
          </div>
        )}

        {/* Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Total de Vídeos</CardTitle><BookOpen className="h-4 w-4 text-muted-foreground" /></div></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalVideos}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Concluídos</CardTitle><CheckCircle className="h-4 w-4 text-green-500" /></div></CardHeader><CardContent><div className="text-2xl font-bold">{stats.watchedVideos}</div></CardContent></Card>
          <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Em Progresso</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></div></CardHeader><CardContent><div className="text-2xl font-bold">{stats.inProgress}</div></CardContent></Card>
        </div>

        <SupportFilesList />

        {/* Continue Assistindo */}
        {!isLoading && inProgressVideos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Continue Assistindo</CardTitle>
              <CardDescription>Retome de onde você parou</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inProgressVideos.map(({ video, progress }) => video && (
                  <Card key={video.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleVideoClick(video.id)}>
                    <div className="aspect-video relative">
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center"><Play className="h-12 w-12 text-primary/50" /></div>
                      )}
                      <Button size="icon" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary/90">
                        <Play className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold line-clamp-1">{video.title}</h3>
                      <Progress value={progress} className="h-1" />
                      <p className="text-xs text-muted-foreground">{Math.round(progress)}% concluído</p>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Todos os vídeos (somente permitidos) */}
        <Card>
          <CardHeader><CardTitle>Todos os Vídeos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleVideos.map(video => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleVideoClick(video.id)}>
                  <div className="aspect-video relative">
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center"><Play className="h-12 w-12 text-primary/50" /></div>
                    )}
                  </div>
                  <CardHeader className="pb-3"><CardTitle className="text-base line-clamp-1">{video.title}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{formatDuration(video.duration)}</span>
                      <Badge variant="secondary">{categories.find(c => c.id === (video.categoryId || (video as any).category_id))?.name}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}


