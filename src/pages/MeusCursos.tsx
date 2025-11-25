import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  TrendingUp,
  Lock,
  FolderOpen,
  Video,
  AlertCircle
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getCategories, getVideos, getViewHistory, getModules } from '@/lib/storage';
import { Category, Video as VideoType } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function MeusCursos() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [viewHistory, setViewHistory] = useState<any[]>([]);
  const [modulesByCategory, setModulesByCategory] = useState<Record<string, any[]>>({});
  const [detailsCategoryId, setDetailsCategoryId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  useEffect(() => {
    (async () => {
      const [c, v, vh] = await Promise.all([
        getCategories(),
        getVideos(),
        getViewHistory(user?.id),
      ]);
      setCategories(c);
      setVideos(v);
      setViewHistory(vh);
    })();
  }, [user?.id]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Carregar módulos por categoria do usuário
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const cats = user?.assignedCategories 
        ? categories.filter(cat => user.assignedCategories.includes(cat.id))
        : [];
      if (cats.length === 0) {
        setModulesByCategory({});
        return;
      }
      const entries = await Promise.all(
        cats.map(async (c) => [c.id, await getModules(c.id)] as const)
      );
      const map: Record<string, any[]> = {};
      for (const [cid, mods] of entries) map[cid] = mods || [];
      setModulesByCategory(map);
    };
    load();
  }, [user?.assignedCategories, categories]);

  // Redirecionar se não estiver logado
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Filtrar categorias que o usuário tem acesso
  const userCategories = user?.assignedCategories 
    ? categories.filter(cat => user.assignedCategories.includes(cat.id))
    : [];

  // Filtrar vídeos das categorias do usuário
  const userVideos = videos.filter(video => {
    const ids = (video as any).categoryIds || (video as any).category_ids || [video.categoryId].filter(Boolean);
    return (user?.assignedCategories || []).some((cid) => ids.includes(cid));
  });

  // Calcular estatísticas por categoria (agregando por vídeo e com fallback)
  const getCategoryStats = (categoryId: string) => {
    const categoryVideos = videos.filter(v => {
      const ids = (v as any).category_ids || [v.categoryId].filter(Boolean);
      return ids.includes(categoryId);
    });

    const videoIdSet = new Set(categoryVideos.map(v => v.id));
    const watchedEntries = viewHistory.filter(h => videoIdSet.has(h.videoId));

    // Agregar por vídeo: maior tempo assistido e completed se algum registro completou
    const perVideo = new Map<string, { watched: number; completed: boolean }>();
    for (const entry of watchedEntries) {
      const prev = perVideo.get(entry.videoId) || { watched: 0, completed: false };
      perVideo.set(entry.videoId, {
        watched: Math.max(prev.watched, Math.max(0, Number(entry.watchedDuration) || 0)),
        completed: prev.completed || !!entry.completed,
      });
    }

    const totalDuration = categoryVideos.reduce((acc, v) => acc + Math.max(0, Number(v.duration) || 0), 0);
    const watchedSum = categoryVideos.reduce((acc, v) => {
      const vDur = Math.max(0, Number(v.duration) || 0);
      const agg = perVideo.get(v.id);
      const watched = Math.max(0, agg?.watched || 0);
      return acc + Math.min(vDur, watched);
    }, 0);

    const completedVideos = categoryVideos.filter(v => perVideo.get(v.id)?.completed).length;
    const inProgressVideos = categoryVideos.filter(v => {
      const agg = perVideo.get(v.id);
      return !!agg && !agg.completed && (agg.watched || 0) > 0;
    }).length;

    // Percentual: se houver duração total, usar por tempo; senão, fallback por contagem
    const percentage = totalDuration > 0
      ? Math.round(Math.min(100, (watchedSum / totalDuration) * 100))
      : (categoryVideos.length > 0
          ? Math.round((completedVideos / categoryVideos.length) * 100)
          : 0);

    return {
      totalVideos: categoryVideos.length,
      completed: completedVideos,
      inProgress: inProgressVideos,
      percentage,
    };
  };

  // Calcular estatísticas gerais
  const overallStats = {
    totalCourses: userCategories.length,
    totalVideos: userVideos.length,
    completedVideos: viewHistory.filter(h => h.completed).length,
    inProgressVideos: viewHistory.filter(h => !h.completed && h.watchedDuration > 0).length,
    totalWatchTime: viewHistory.reduce((acc, h) => acc + h.watchedDuration, 0)
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleVideoClick = (videoId: string) => {
    navigate(`/video/${videoId}`);
  };

  const getResumeVideoForCategory = (categoryId: string): VideoType | null => {
    const categoryVideos = videos.filter(v => {
      const ids = (v as any).categoryIds || (v as any).category_ids || [v.categoryId].filter(Boolean);
      return ids.includes(categoryId);
    });
    if (categoryVideos.length === 0) return null;
    const idSet = new Set(categoryVideos.map(v => v.id));
    const inProgress = viewHistory
      .filter(h => idSet.has(h.videoId) && !h.completed)
      .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());
    const recentAny = viewHistory
      .filter(h => idSet.has(h.videoId))
      .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());
    const pick = (inProgress[0]?.videoId) || (recentAny[0]?.videoId) || categoryVideos[0]?.id;
    return categoryVideos.find(v => v.id === pick) || null;
  };

  const renderModuleProgress = (moduleId: string | undefined, categoryVideos: VideoType[]) => {
    const vids = categoryVideos.filter(v => (v as any).moduleId === moduleId || (v as any).module_id === moduleId);
    const total = vids.length;
    if (total === 0) return { total: 0, completed: 0, percentage: 0 };
    const completed = vids.filter(v => !!viewHistory.find(h => h.videoId === v.id && h.completed)).length;
    const percentage = Math.round((completed / total) * 100);
    return { total, completed, percentage };
  };

  const renderCategoryDetails = (categoryId: string) => {
    const categoryVideos = videos.filter(v => {
      const ids = (v as any).categoryIds || (v as any).category_ids || [v.categoryId].filter(Boolean);
      return ids.includes(categoryId);
    });
    const mods = (modulesByCategory[categoryId] || []) as Array<{ id: string; title: string; parentId?: string | null; order?: number }>; 
    const roots = mods.filter(m => !m.parentId)
      .sort((a, b) => (Number((a as unknown as { order?: number }).order || 0) - Number((b as unknown as { order?: number }).order || 0)) || String(a.title).localeCompare(String(b.title)));
    const childOf = (pid: string) => mods.filter(m => m.parentId === pid)
      .sort((a, b) => (Number((a as unknown as { order?: number }).order || 0) - Number((b as unknown as { order?: number }).order || 0)) || String(a.title).localeCompare(String(b.title)));
    const vidsByModule = (mid?: string) => categoryVideos.filter(v => (v as any).moduleId === mid || (v as any).module_id === mid);

    const hasModules = mods.length > 0;
    if (!hasModules) {
      return (
        <div className="space-y-2">
          {categoryVideos.map(video => {
            const history = viewHistory.find(h => h.videoId === video.id);
            return (
              <div key={video.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={() => handleVideoClick(video.id)}>
                <div className="flex items-center gap-3">
                  {history?.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : history && history.watchedDuration > 0 ? (
                    <PlayCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{video.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDuration(video.duration)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Assistir</Button>
              </div>
            );
          })}
        </div>
      );
    }

    // Função recursiva para renderizar módulos
    const renderModuleRecursive = (
      module: { id: string; title: string; parentId?: string | null },
      level: number
    ) => {
      const moduleVideos = vidsByModule(module.id);
      const childModules = childOf(module.id);
      const hasAny = moduleVideos.length > 0 || childModules.length > 0;
      if (!hasAny) return null;

      const moduleStats = renderModuleProgress(module.id, categoryVideos);
      const headingClass = level === 0 ? 'text-sm font-semibold' : level === 1 ? 'text-xs font-medium' : 'text-[10px] font-medium';
      const indentStyle = level > 0 ? { marginLeft: `${level * 0.5}rem` } : {};

      return (
        <div key={module.id} style={indentStyle} className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className={headingClass}>{module.title}</div>
            <span className={`text-xs text-muted-foreground ${level > 1 ? 'text-[10px]' : ''}`}>
              {moduleStats.completed}/{moduleStats.total}
            </span>
          </div>
          <Progress value={moduleStats.percentage} className="h-1 mb-2" />
          {moduleVideos.length > 0 && (
            <div className="space-y-2 mb-3">
              {moduleVideos.map(video => {
                const history = viewHistory.find(h => h.videoId === video.id);
                return (
                  <div key={video.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={() => handleVideoClick(video.id)}>
                    <div className="flex items-center gap-3">
                      {history?.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : history && history.watchedDuration > 0 ? (
                        <PlayCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{video.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDuration(video.duration)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Assistir</Button>
                  </div>
                );
              })}
            </div>
          )}
          {childModules.map(child => renderModuleRecursive(child, level + 1))}
        </div>
      );
    };

    return (
      <div className="space-y-5">
        {roots.map(root => renderModuleRecursive(root, 0))}
        {categoryVideos.filter(v => !(v as any).moduleId && !(v as any).module_id).length > 0 && (
          <div>
            <h5 className="text-sm font-semibold mb-2">Outros</h5>
            <div className="space-y-2">
              {categoryVideos.filter(v => !(v as any).moduleId && !(v as any).module_id).map(video => {
                const history = viewHistory.find(h => h.videoId === video.id);
                return (
                  <div key={video.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={() => handleVideoClick(video.id)}>
                    <div className="flex items-center gap-3">
                      {history?.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : history && history.watchedDuration > 0 ? (
                        <PlayCircle className="h-4 w-4 text-primary" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{video.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDuration(video.duration)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Assistir</Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-poppins font-bold mb-2">Meus Cursos</h1>
          <p className="text-muted-foreground">
            Acompanhe seu progresso e continue aprendendo
          </p>
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Cursos</CardTitle>
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalCourses}</div>
              <p className="text-xs text-muted-foreground">disponíveis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Vídeos</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalVideos}</div>
              <p className="text-xs text-muted-foreground">para assistir</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.completedVideos}</div>
              <p className="text-xs text-muted-foreground">vídeos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.inProgressVideos}</div>
              <p className="text-xs text-muted-foreground">vídeos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(overallStats.totalWatchTime / 3600)}h
              </div>
              <p className="text-xs text-muted-foreground">de estudo</p>
            </CardContent>
          </Card>
        </div>

        {/* Courses Content */}
        {userCategories.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-muted rounded-full">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Nenhum curso disponível</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Você ainda não tem acesso a nenhum curso. Entre em contato com o administrador 
                  para solicitar acesso aos cursos de treinamento.
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="mt-4"
              >
                Ir para Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="grid" className="space-y-4">
            <TabsList>
              <TabsTrigger value="grid">Visualização em Grade</TabsTrigger>
              <TabsTrigger value="list">Visualização em Lista</TabsTrigger>
            </TabsList>

            {/* Grid View */}
            <TabsContent value="grid" className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {userCategories.map(category => {
                  const stats = getCategoryStats(category.id);
                  const categoryVideos = videos.filter(v => {
                    const ids = (v as any).categoryIds || (v as any).category_ids || [v.categoryId].filter(Boolean);
                    return ids.includes(category.id);
                  });
                  
                  return (
                    <Card 
                      key={category.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                      onClick={() => { setIsDetailsOpen(true); setDetailsCategoryId(category.id); }}
                    >
                      <div className="h-2 bg-gradient-to-r from-primary/20 to-primary/10" />
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <FolderOpen className="h-5 w-5 text-primary" />
                              {category.name}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {category.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {stats.totalVideos} vídeos
                          </span>
                          <div className="flex items-center gap-2">
                            {stats.completed > 0 && (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {stats.completed}
                              </Badge>
                            )}
                            {stats.inProgress > 0 && (
                              <Badge variant="outline" className="gap-1">
                                <PlayCircle className="h-3 w-3" />
                                {stats.inProgress}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">{stats.percentage}%</span>
                          </div>
                          <Progress value={stats.percentage} className="h-2" />
                        </div>

                        {categoryVideos.length > 0 ? (
                          <Button asChild className="w-full" onClick={(e) => e.stopPropagation()}>
                            <Link to={`/video/${categoryVideos[0].id}`}>
                              <PlayCircle className="h-4 w-4 mr-2" />
                              {stats.inProgress > 0 ? 'Continuar' : 'Iniciar Curso'}
                            </Link>
                          </Button>
                        ) : (
                          <Button className="w-full" disabled>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Indisponível
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Modal de detalhes por módulos */}
              <Dialog open={isDetailsOpen} onOpenChange={(open) => { setIsDetailsOpen(open); if (!open) setDetailsCategoryId(null); }}>
                <DialogContent className="max-w-4xl" aria-describedby="course-details-desc">
                  <DialogHeader>
                    <DialogTitle>Conteúdo do Curso</DialogTitle>
                  </DialogHeader>
                  {detailsCategoryId && (() => {
                    const resume = getResumeVideoForCategory(detailsCategoryId);
                    return resume ? (
                      <div className="flex justify-end mb-3">
                        <Button onClick={() => navigate(`/video/${resume.id}`)}>
                          Continuar do último vídeo
                        </Button>
                      </div>
                    ) : null;
                  })()}
                  <div id="course-details-desc" className="max-h-[70vh] overflow-y-auto">
                    {detailsCategoryId ? renderCategoryDetails(detailsCategoryId) : null}
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* List View */}
            <TabsContent value="list" className="space-y-4">
              {userCategories.map(category => {
                const stats = getCategoryStats(category.id);
                const categoryVideos = videos.filter(v => {
                  const ids = (v as any).categoryIds || (v as any).category_ids || [v.categoryId].filter(Boolean);
                  return ids.includes(category.id);
                });
                
                return (
                  <Card key={category.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FolderOpen className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle>{category.name}</CardTitle>
                            <CardDescription>{category.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">{stats.percentage}%</p>
                            <p className="text-xs text-muted-foreground">concluído</p>
                          </div>
                          {categoryVideos.length > 0 ? (
                            <Button asChild>
                              <Link to={`/video/${categoryVideos[0].id}`}>
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Acessar
                              </Link>
                            </Button>
                          ) : (
                            <Button disabled>
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Indisponível
                            </Button>
                          )}
                          <Button 
                            variant="outline"
                            onClick={() => setSelectedCategory(prev => prev === category.id ? null : category.id)}
                          >
                            Ver detalhes
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Progress value={stats.percentage} className="h-2" />
                        
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <span>{stats.totalVideos} vídeos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>{stats.completed} concluídos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <PlayCircle className="h-4 w-4 text-primary" />
                            <span>{stats.inProgress} em progresso</span>
                          </div>
                        </div>

                        {/* Detalhes por Módulos/Submódulos */}
                        {selectedCategory === category.id && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium mb-3">Conteúdo do Curso por Módulos</h4>
                            {(() => {
                              const mods = (modulesByCategory[category.id] || []) as Array<{ id: string; title: string; parentId?: string | null; order?: number }>; 
                              const roots = mods.filter(m => !m.parentId)
                                .sort((a, b) => (Number((a as unknown as { order?: number }).order || 0) - Number((b as unknown as { order?: number }).order || 0)) || String(a.title).localeCompare(String(b.title)));
                              const childOf = (pid: string) => mods.filter(m => m.parentId === pid)
                                .sort((a, b) => (Number((a as unknown as { order?: number }).order || 0) - Number((b as unknown as { order?: number }).order || 0)) || String(a.title).localeCompare(String(b.title)));
                              const vids = categoryVideos;
                              const vidsByModule = (mid?: string) => vids.filter(v => (v as any).moduleId === mid || (v as any).module_id === mid);
                              const hasModules = mods.length > 0;

                              if (hasModules) {
                                return (
                                  <div className="space-y-5">
                                    {roots.map(root => {
                                      const rootVids = vidsByModule(root.id);
                                      const children = childOf(root.id);
                                      const groups = children.map(ch => ({ ch, list: vidsByModule(ch.id) }));
                                      const hasAny = rootVids.length > 0 || groups.some(g => g.list.length > 0);
                                      if (!hasAny) return null;
                                      return (
                                        <div key={root.id}>
                                          <h5 className="text-sm font-semibold mb-2">{root.title}</h5>
                                          {rootVids.length > 0 && (
                                            <div className="space-y-2 mb-3">
                                              {rootVids.map(video => {
                                                const history = viewHistory.find(h => h.videoId === video.id);
                                                return (
                                                  <div key={video.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={() => handleVideoClick(video.id)}>
                                                    <div className="flex items-center gap-3">
                                                      {history?.completed ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                      ) : history && history.watchedDuration > 0 ? (
                                                        <PlayCircle className="h-4 w-4 text-primary" />
                                                      ) : (
                                                        <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                                      )}
                                                      <div>
                                                        <p className="font-medium text-sm">{video.title}</p>
                                                        <p className="text-xs text-muted-foreground">{formatDuration(video.duration)}</p>
                                                      </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm">Assistir</Button>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                          {groups.map(({ ch, list }) => list.length === 0 ? null : (
                                            <div key={ch.id} className="ml-2 mb-3">
                                              <div className="text-xs font-medium mb-2">{ch.title}</div>
                                              <div className="space-y-2">
                                                {list.map(video => {
                                                  const history = viewHistory.find(h => h.videoId === video.id);
                                                  return (
                                                    <div key={video.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={() => handleVideoClick(video.id)}>
                                                      <div className="flex items-center gap-3">
                                                        {history?.completed ? (
                                                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        ) : history && history.watchedDuration > 0 ? (
                                                          <PlayCircle className="h-4 w-4 text-primary" />
                                                        ) : (
                                                          <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                        <div>
                                                          <p className="font-medium text-sm">{video.title}</p>
                                                          <p className="text-xs text-muted-foreground">{formatDuration(video.duration)}</p>
                                                        </div>
                                                      </div>
                                                      <Button variant="ghost" size="sm">Assistir</Button>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })}
                                    {/* Fallback: vídeos sem módulo */}
                                    {vids.filter(v => !(v as any).moduleId && !(v as any).module_id).length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold mb-2">Outros</h5>
                                        <div className="space-y-2">
                                          {vids.filter(v => !(v as any).moduleId && !(v as any).module_id).map(video => {
                                            const history = viewHistory.find(h => h.videoId === video.id);
                                            return (
                                              <div key={video.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={() => handleVideoClick(video.id)}>
                                                <div className="flex items-center gap-3">
                                                  {history?.completed ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                  ) : history && history.watchedDuration > 0 ? (
                                                    <PlayCircle className="h-4 w-4 text-primary" />
                                                  ) : (
                                                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                                  )}
                                                  <div>
                                                    <p className="font-medium text-sm">{video.title}</p>
                                                    <p className="text-xs text-muted-foreground">{formatDuration(video.duration)}</p>
                                                  </div>
                                                </div>
                                                <Button variant="ghost" size="sm">Assistir</Button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              // Sem módulos: lista simples (comportamento antigo)
                              return (
                                <div className="space-y-2">
                                  {vids.map(video => {
                                    const history = viewHistory.find(h => h.videoId === video.id);
                                    return (
                                      <div key={video.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={() => handleVideoClick(video.id)}>
                                        <div className="flex items-center gap-3">
                                          {history?.completed ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                          ) : history && history.watchedDuration > 0 ? (
                                            <PlayCircle className="h-4 w-4 text-primary" />
                                          ) : (
                                            <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                          )}
                                          <div>
                                            <p className="font-medium text-sm">{video.title}</p>
                                            <p className="text-xs text-muted-foreground">{formatDuration(video.duration)}</p>
                                          </div>
                                        </div>
                                        <Button variant="ghost" size="sm">Assistir</Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}

        {/* Info Alert */}
        {userCategories.length > 0 && userCategories.length < categories.length && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Cursos Limitados</p>
                <p className="text-sm text-muted-foreground">
                  Você tem acesso a {userCategories.length} de {categories.length} cursos disponíveis. 
                  Para acessar mais cursos, entre em contato com o administrador.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}