import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import SupportFilesList from '@/components/SupportFilesList';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, CheckCircle, BookOpen, TrendingUp, FileText } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getCategories, getVideos, getViewHistory, getWelcomeVideo, getModules } from '@/lib/storage';
import VideoCard from '@/components/VideoCard';
import ModuleBadge from '@/components/ModuleBadge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '@/hooks/useFavorites';
import { isActualVideo, isSupportMaterial } from '@/lib/utils';

export default function UserDashboardCliente() {
  const { user, categories, videos, viewHistory, welcomeVideo, modulesByCategory, isLoading } = useDashboardData('cliente');
  const navigate = useNavigate();
  const [modulesByCategoryLocal, setModulesByCategoryLocal] = useState<Record<string, any[]>>({});
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [moduleQuery, setModuleQuery] = useState('');
  const { isFavorite, toggleFavorite } = useFavorites();
  const [visibleCount, setVisibleCount] = useState(16);

  useEffect(() => {
    // manter compatibilidade local
    setModulesByCategoryLocal(modulesByCategory);
  }, [modulesByCategory]);

  // Permissões por categorias OU módulos
  const allowedCategories = new Set<string>(user?.assignedCategories || []);
  const allowedModules = new Set<string>(user?.assignedModules || []);
  
  // Filtrar apenas vídeos reais (excluir PDFs e materiais de apoio)
  const visibleVideos = videos.filter(v => {
    const categoryIds: string[] = (v as any).category_ids || [v.categoryId || (v as any).category_id].filter(Boolean);
    const moduleId: string | undefined = (v as any).moduleId || (v as any).module_id;
    const byCategory = categoryIds.some(id => allowedCategories.has(id));
    const byModule = moduleId ? allowedModules.has(moduleId) : false;
    const byModuleFilter = selectedModules.length === 0 ? true : (moduleId ? selectedModules.includes(moduleId) : false);
    return (byCategory || byModule) && byModuleFilter && isActualVideo(v);
  });

  // Filtrar materiais de apoio das categorias permitidas
  const supportMaterials = videos.filter(v => {
    const categoryIds: string[] = (v as any).category_ids || [v.categoryId || (v as any).category_id].filter(Boolean);
    const byCategory = categoryIds.some(id => allowedCategories.has(id));
    return byCategory && isSupportMaterial(v);
  });

  useEffect(() => {
    const handler = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (atBottom) setVisibleCount(prev => Math.min(prev + 12, visibleVideos.length));
    };
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, [visibleVideos.length]);

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
        {/* Filtro por módulos/submódulos */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">Filtrar por módulos</span>
            <input className="border rounded px-2 py-1 text-sm" placeholder="Buscar módulos..." value={moduleQuery} onChange={(e) => setModuleQuery(e.target.value)} />
            {(selectedModules.length > 0) && (
              <Button variant="outline" size="sm" onClick={() => { setSelectedModules([]); setModuleQuery(''); }}>Limpar</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const catIds = Array.from(allowedCategories);
              const allMods = catIds.flatMap((cid: string) => (modulesByCategoryLocal[cid] || []) as Array<{ id: string; title: string; parentId?: string | null }>);
              const byId = new Map(allMods.map(m => [m.id, m] as const));
              const toLabel = (m: any) => m.parentId ? `${byId.get(m.parentId)?.title || ''} > ${m.title}` : m.title;
              const unique = new Map<string, any>();
              for (const m of allMods) unique.set(m.id, m);
              return Array.from(unique.values())
                .filter(m => toLabel(m).toLowerCase().includes(moduleQuery.toLowerCase()))
                .sort((a, b) => String(toLabel(a)).localeCompare(String(toLabel(b))))
                .map((m: any) => {
                  const active = selectedModules.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModules(prev => active ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                      className={`px-3 py-1 rounded-full text-xs border ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border'}`}
                      title={toLabel(m)}
                    >
                      {toLabel(m)}
                    </button>
                  );
                });
            })()}
          </div>
        </div>
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
                      {(() => {
                        const catId = (video as any).categoryId || (video as any).category_id;
                        const list = modulesByCategory[catId] || [];
                        const mid = (video as any).moduleId || (video as any).module_id;
                        const mod = list.find((m: any) => m.id === mid);
                        return mod ? (
                          <Badge variant="outline" className="w-fit text-[10px]">{mod.title}</Badge>
                        ) : null;
                      })()}
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
              {visibleVideos.slice(0, visibleCount).map(video => {
                const history = viewHistory.find(h => h.videoId === video.id);
                const progress = history ? (() => {
                  const total = Number(video.duration) || 0;
                  const raw = total > 0 ? (history.watchedDuration / total) * 100 : (history.completed ? 100 : 0);
                  return Math.max(0, Math.min(100, raw));
                })() : 0;
                const uploadedAt = new Date((video as any).uploadedAt || (video as any).created_at || 0);
                const isNew = (Date.now() - uploadedAt.getTime()) < (7 * 24 * 60 * 60 * 1000);
                return (
                  <VideoCard
                    key={video.id}
                    video={video}
                    progressPercentage={progress}
                    modulesByCategory={modulesByCategoryLocal}
                    categories={categories}
                    onClick={handleVideoClick}
                    isFavorite={isFavorite(video.id)}
                    onToggleFavorite={toggleFavorite}
                    isNew={isNew}
                    onResume={handleVideoClick}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Support Materials Section */}
        {supportMaterials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Materiais de Apoio</CardTitle>
              <CardDescription>PDFs e documentos complementares</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {supportMaterials.map(material => {
                  const category = categories.find(c => c.id === material.categoryId);
                  return (
                    <Card 
                      key={material.id} 
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/video/${material.id}`)}
                    >
                      <div className="aspect-video relative bg-gradient-to-br from-orange-500/20 to-orange-500/10 flex items-center justify-center">
                        <FileText className="h-16 w-16 text-orange-500/70" />
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base line-clamp-2">{material.title}</CardTitle>
                        {material.description && (
                          <CardDescription className="line-clamp-2 text-xs">
                            {material.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-xs text-muted-foreground">PDF</span>
                          {category && (
                            <Badge variant="secondary" className="text-xs">
                              {category.name}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}


