import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, CheckCircle, BookOpen, TrendingUp, Grid, List, Search } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getCategories, getVideos, getViewHistory, getWelcomeVideo } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';

export default function UserDashboard() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categories, setCategories] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [viewHistory, setViewHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [welcomeVideo, setWelcomeVideoState] = useState<any | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'inProgress'>('all');
  const [minDurationMin, setMinDurationMin] = useState<number>(0);
  const [orderBy, setOrderBy] = useState<'recent' | 'oldest' | 'title'>('recent');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [c, v, vh, wv] = await Promise.all([
        getCategories(),
        getVideos(),
        getViewHistory(user?.id),
        getWelcomeVideo('user'),
      ]);
      setCategories(c);
      setVideos(v);
      setViewHistory(vh);
      setWelcomeVideoState(wv);
      setIsLoading(false);
    })();
  }, [user?.id]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Persist filters
  useEffect(() => {
    const saved = localStorage.getItem('ud_filters');
    if (saved) {
      try {
        const f = JSON.parse(saved);
        setSelectedCategories(f.selectedCategories || []);
        setStatusFilter(f.statusFilter || 'all');
        setMinDurationMin(f.minDurationMin || 0);
        setOrderBy(f.orderBy || 'recent');
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('ud_filters', JSON.stringify({ selectedCategories, statusFilter, minDurationMin, orderBy }));
  }, [selectedCategories, statusFilter, minDurationMin, orderBy]);
  
  // Restringir conteúdo às categorias do usuário (exceto admin)
  const allowedCategoryIds = user?.role === 'admin' ? null : new Set<string>(user?.assignedCategories || []);
  const visibleVideos = allowedCategoryIds
    ? videos.filter(v => allowedCategoryIds.has((v.categoryId || v.category_id) as string))
    : videos;
  const visibleCategories = allowedCategoryIds
    ? categories.filter(c => allowedCategoryIds.has(c.id))
    : categories;

  // Filtrar vídeos com base na busca
  const filteredVideos = useMemo(() => {
    const byQuery = (list: any[]) => list.filter(video =>
      (video.title || '').toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      (video.description || '').toLowerCase().includes(debouncedQuery.toLowerCase())
    );
    const byCats = (list: any[]) => {
      if (selectedCategories.length === 0) return list;
      return list.filter(v => {
        const ids: string[] = (v as any).category_ids || [v.categoryId || (v as any).category_id].filter(Boolean);
        return selectedCategories.some(id => ids.includes(id));
      });
    };
    const byStatus = (list: any[]) => {
      if (statusFilter === 'all') return list;
      return list.filter(v => {
        const h = viewHistory.find(h => h.videoId === v.id);
        return statusFilter === 'completed' ? !!h?.completed : !!h && !h.completed && (h.watchedDuration || 0) > 0;
      });
    };
    const byMinDuration = (list: any[]) => list.filter(v => (v.duration || 0) >= (minDurationMin * 60));
    const order = (list: any[]) => {
      const arr = [...list];
      if (orderBy === 'recent') {
        return arr.sort((a, b) => new Date(b.uploadedAt || b.created_at || 0).getTime() - new Date(a.uploadedAt || a.created_at || 0).getTime());
      }
      if (orderBy === 'oldest') {
        return arr.sort((a, b) => new Date(a.uploadedAt || a.created_at || 0).getTime() - new Date(b.uploadedAt || b.created_at || 0).getTime());
      }
      return arr.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    };
    return order(byMinDuration(byStatus(byCats(byQuery(visibleVideos)))));
  }, [visibleVideos, debouncedQuery, selectedCategories, statusFilter, minDurationMin, orderBy, viewHistory]);

  const highlight = (text: string) => {
    if (!debouncedQuery) return text;
    const q = debouncedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.split(new RegExp(`(${q})`, 'ig')).map((part, i) => (
      part.toLowerCase() === debouncedQuery.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
        : <span key={i}>{part}</span>
    ));
  };

  // Calcular estatísticas do usuário
  const stats = {
    totalVideos: visibleVideos.length,
    watchedVideos: viewHistory.filter(h => h.completed).length,
    inProgress: viewHistory.filter(h => !h.completed).length,
    totalWatchTime: viewHistory.reduce((acc, h) => acc + h.watchedDuration, 0),
  };

  // Vídeos recentes (últimos assistidos)
  const recentVideos = viewHistory
    .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
    .slice(0, 6)
    .map(h => visibleVideos.find(v => v.id === h.videoId))
    .filter(Boolean);

  // Vídeos em progresso
  const inProgressVideos = viewHistory
    .map(h => {
      const vid = visibleVideos.find(v => v.id === h.videoId);
      const total = vid?.duration || 0;
      const raw = total > 0 ? (h.watchedDuration / total) * 100 : (h.completed ? 100 : 0);
      const clamped = Math.max(0, Math.min(100, raw));
      return { video: vid, progress: clamped, completed: !!h.completed };
    })
    .filter(item => item.video && !item.completed && item.progress < 100);

  const handleVideoClick = (videoId: string) => {
    navigate(`/video/${videoId}`);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-poppins font-bold mb-2">
            Bem-vindo de volta, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Continue aprendendo e desenvolvendo suas habilidades
          </p>
        </div>

        {/* Vídeo de boas‑vindas (configurável no Admin) */}
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

        {/* Materiais de apoio (se configurados) */}
        <SupportFilesList />

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total de Vídeos</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVideos}</div>
              <p className="text-xs text-muted-foreground">disponíveis para você</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.watchedVideos}</div>
              <p className="text-xs text-muted-foreground">vídeos completos</p>
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
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">continue assistindo</p>
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
                {Math.floor(stats.totalWatchTime / 3600)}h
              </div>
              <p className="text-xs text-muted-foreground">de aprendizado</p>
            </CardContent>
          </Card>
        </div>

        {/* Continue Watching Section */}
        {!isLoading && inProgressVideos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Continue Assistindo</CardTitle>
              <CardDescription>
                Retome de onde você parou
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 overflow-x-auto md:overflow-visible [scroll-snap-type:x_mandatory] md:[scroll-snap-type:none] grid-flow-col auto-cols-[80%] md:auto-cols-auto">
                {inProgressVideos.map(({ video, progress }) => video && (
                  <Card 
                    key={video.id} 
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer [scroll-snap-align:start]"
                    onClick={() => handleVideoClick(video.id)}
                  >
                    <div className="aspect-video relative">
                      {video.thumbnail ? (
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <Play className="h-12 w-12 text-primary/50" />
                        </div>
                      )}
                      <Button 
                        size="icon" 
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary/90 hover:bg-primary"
                        onClick={() => handleVideoClick(video.id)}
                      >
                        <Play className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold line-clamp-1">{highlight(video.title)}</h3>
                      <Progress value={progress} className="h-1" />
                      <p className="text-xs text-muted-foreground">
                        {Math.round(progress)}% concluído
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros rápidos */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((c: any) => {
              const active = selectedCategories.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategories(prev => active ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                  className={`px-3 py-1 rounded-full text-xs border ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border'}`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>Filtros</Button>
        </div>
        {showFilters && (
          <div className="flex flex-col gap-3 text-sm text-muted-foreground" role="region" aria-label="Filtros">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                Status
                <select
                  className="border rounded px-2 py-1"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">Todos</option>
                  <option value="completed">Concluídos</option>
                  <option value="inProgress">Em progresso</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                Duração mínima (min)
                <input
                  type="number"
                  min={0}
                  className="w-20 border rounded px-2 py-1"
                  value={minDurationMin}
                  onChange={(e) => setMinDurationMin(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </label>
              <label className="flex items-center gap-2">
                Ordenar
                <select
                  className="border rounded px-2 py-1"
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value as any)}
                >
                  <option value="recent">Mais recentes</option>
                  <option value="oldest">Mais antigos</option>
                  <option value="title">Título (A–Z)</option>
                </select>
              </label>
              <span className="ml-auto">{filteredVideos.length} vídeos</span>
              {(selectedCategories.length > 0 || statusFilter !== 'all' || minDurationMin > 0) && (
                <button className="underline" onClick={() => { setSelectedCategories([]); setStatusFilter('all'); setMinDurationMin(0); setOrderBy('recent'); }}>limpar filtros</button>
              )}
            </div>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">Todos os Vídeos</TabsTrigger>
              <TabsTrigger value="categories">Por Categoria</TabsTrigger>
              <TabsTrigger value="recent">Recentes</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar vídeos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* All Videos Tab */}
          <TabsContent value="all" className="space-y-4">
            <div className={viewMode === 'grid' 
              ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
              : "space-y-4"
            }>
              {isLoading ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-lg border animate-pulse h-64 bg-muted" />
                  ))}
                </>
              ) : filteredVideos.length === 0 ? (
                <Card className="text-center py-12 col-span-full">
                  <CardContent>
                    <p className="text-muted-foreground">Nenhum vídeo encontrado.</p>
                  </CardContent>
                </Card>
              ) : filteredVideos.map(video => {
                const history = viewHistory.find(h => h.videoId === video.id);
                const progressPercentage = history ? (() => {
                  const total = Number(video.duration) || 0;
                  const raw = total > 0 ? (history.watchedDuration / total) * 100 : (history.completed ? 100 : 0);
                  return Math.max(0, Math.min(100, raw));
                })() : 0;

                return viewMode === 'grid' ? (
                  <Card 
                    key={video.id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleVideoClick(video.id)}
                  >
                    <div className="aspect-video relative">
                      {video.thumbnail ? (
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <Play className="h-12 w-12 text-primary/50" />
                        </div>
                      )}
                      {history?.completed && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      )}
                      <Button 
                        size="icon" 
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary/90 hover:bg-primary opacity-100"
                        onClick={(e) => { e.stopPropagation(); handleVideoClick(video.id); }}
                      >
                        <Play className="h-5 w-5" />
                      </Button>
                      {progressPercentage > 0 && progressPercentage < 100 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                          <div 
                            className="h-full bg-primary"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base line-clamp-1">{highlight(video.title)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {video.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDuration(video.duration)}
                        </span>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {(((video as any).category_ids) || [video.categoryId || (video as any).category_id]).filter(Boolean).slice(0,2).map((cid: string) => (
                            <Badge key={cid} variant="secondary" className="text-xs">
                              {categories.find(c => c.id === cid)?.name || 'Sem categoria'}
                            </Badge>
                          ))}
                          {((video as any).category_ids?.length || 0) > 2 && (
                            <Badge variant="outline" className="text-[10px]">+{(video as any).category_ids.length - 2}</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card 
                    key={video.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleVideoClick(video.id)}
                  >
                    <CardContent className="p-4 flex gap-4">
                      <div className="aspect-video w-48 relative flex-shrink-0">
                        {video.thumbnail ? (
                          <img 
                            src={video.thumbnail} 
                            alt={video.title}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center rounded-md">
                            <Play className="h-8 w-8 text-primary/50" />
                          </div>
                        )}
                        {history?.completed && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg">{video.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {video.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(video.duration)}
                          </span>
                          <Badge variant="secondary">
                            {categories.find(c => c.id === video.categoryId)?.name}
                          </Badge>
                        </div>
                        {progressPercentage > 0 && progressPercentage < 100 && (
                          <div className="space-y-1">
                            <Progress value={progressPercentage} className="h-1" />
                            <p className="text-xs text-muted-foreground">
                              {Math.round(progressPercentage)}% concluído
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            {visibleCategories.map(category => {
              const categoryVideos = filteredVideos.filter(v => {
                const ids: string[] = ((v as unknown as { category_ids?: string[]; category_id?: string }).category_ids) || [v.categoryId || (v as unknown as { category_id?: string }).category_id].filter(Boolean) as string[];
                return ids.includes(category.id);
              });
              
              if (categoryVideos.length === 0) return null;
              
              return (
                <div key={category.id}>
                  <div className="mb-4">
                    <h2 className="text-xl font-poppins font-semibold">{category.name}</h2>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {categoryVideos.map(video => {
                      const history = viewHistory.find(h => h.videoId === video.id);
                      
                      return (
                        <Card 
                          key={video.id} 
                          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => handleVideoClick(video.id)}
                        >
                          <div className="aspect-video relative">
                            {video.thumbnail ? (
                              <img 
                                src={video.thumbnail} 
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <Play className="h-12 w-12 text-primary/50" />
                              </div>
                            )}
                            {history?.completed && (
                              <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                                <CheckCircle className="h-4 w-4" />
                              </div>
                            )}
                            <Button 
                              size="icon" 
                              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary/90 hover:bg-primary opacity-0 hover:opacity-100 transition-opacity"
                              onClick={() => handleVideoClick(video.id)}
                            >
                              <Play className="h-5 w-5" />
                            </Button>
                          </div>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base line-clamp-1">{video.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDuration(video.duration)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* Recent Tab */}
          <TabsContent value="recent" className="space-y-4">
            {recentVideos.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentVideos.map(video => video && (
                  <Card 
                    key={video.id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleVideoClick(video.id)}
                  >
                    <div className="aspect-video relative">
                      {video.thumbnail ? (
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <Play className="h-12 w-12 text-primary/50" />
                        </div>
                      )}
                      <Button 
                        size="icon" 
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary/90 hover:bg-primary"
                        onClick={() => handleVideoClick(video.id)}
                      >
                        <Play className="h-5 w-5" />
                      </Button>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-base">{video.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDuration(video.duration)}
                        </span>
                        <Badge variant="secondary">
                          {categories.find(c => c.id === video.categoryId)?.name}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">
                    Você ainda não assistiu nenhum vídeo.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Comece explorando os vídeos disponíveis!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}