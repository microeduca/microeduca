import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, CheckCircle, BookOpen, TrendingUp, Grid, List, Search, FileText, MessageCircle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getCategories, getVideos, getViewHistory, getWelcomeVideo, getModules } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import SupportFilesList from '@/components/SupportFilesList';
import VideoCard from '@/components/VideoCard';
import ModuleBadge from '@/components/ModuleBadge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useFavorites } from '@/hooks/useFavorites';
import { formatDurationLong, isActualVideo, isReleased, isSupportMaterial } from '@/lib/utils';
import { SkeletonCartoes, SkeletonEstatisticas } from '@/components/LoadingState';
import { useDiasNovidade, useNaoLidas } from '@/hooks/queries';
import QuadroDeAvisos from '@/components/QuadroDeAvisos';
import NavegadorDePastas from '@/components/NavegadorDePastas';

export default function UserDashboard() {
  const { user, categories, videos, viewHistory, welcomeVideo, modulesByCategory, isLoading } = useDashboardData('user');
  const diasNovidade = useDiasNovidade();
  const naoLidas = useNaoLidas();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'inProgress'>('all');
  const [minDurationMin, setMinDurationMin] = useState<number>(0);
  const [orderBy, setOrderBy] = useState<'recent' | 'oldest' | 'title'>('recent');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [moduleQuery, setModuleQuery] = useState('');
  const { favoriteIds, isFavorite, toggleFavorite } = useFavorites();
  const [visibleCount, setVisibleCount] = useState(16);

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
        setSelectedModules(f.selectedModules || []);
        setStatusFilter(f.statusFilter || 'all');
        setMinDurationMin(f.minDurationMin || 0);
        setOrderBy(f.orderBy || 'recent');
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('ud_filters', JSON.stringify({ selectedCategories, selectedModules, statusFilter, minDurationMin, orderBy }));
  }, [selectedCategories, selectedModules, statusFilter, minDurationMin, orderBy]);
  
  // Restringir conteúdo às categorias/módulos do usuário (exceto admin)
  const isAdmin = user?.role === 'admin';
  const allowedCategoryIds = isAdmin ? null : new Set<string>(user?.assignedCategories || []);
  const allowedModuleIds = isAdmin ? null : new Set<string>(user?.assignedModules || []);
  const findModule = (moduleId?: string) => {
    if (!moduleId) return null;
    return Object.values(modulesByCategory).flat().find((m: any) => m.id === moduleId) || null;
  };
  const isContentReleased = (v: any) => {
    if (isAdmin) return true;
    const categoryIds: string[] = (v as any).category_ids || [v.categoryId || (v as any).category_id].filter(Boolean);
    const categoriesReleased = categoryIds.some((id) => {
      const category = categories.find((c) => c.id === id);
      return !category || isReleased(category);
    });
    const module = findModule((v as any).moduleId || (v as any).module_id);
    return isReleased(v) && categoriesReleased && (!module || isReleased(module));
  };
  
  // Filtrar apenas vídeos reais (excluir PDFs e materiais de apoio)
  const visibleVideos = (isAdmin
    ? videos
    : videos.filter(v => {
        const categoryIds: string[] = (v as any).category_ids || [v.categoryId || (v as any).category_id].filter(Boolean);
        const moduleId: string | undefined = (v as any).moduleId || (v as any).module_id;
        const inAllowedCategories = categoryIds.some(id => (allowedCategoryIds as Set<string>).has(id));
        const inAllowedModules = moduleId ? (allowedModuleIds as Set<string>).has(moduleId) : false;
        return inAllowedCategories || inAllowedModules;
      })).filter(v => isActualVideo(v) && isContentReleased(v));

  // Filtrar materiais de apoio das categorias permitidas
  const supportMaterials = (isAdmin
    ? videos
    : videos.filter(v => {
        const categoryIds: string[] = (v as any).category_ids || [v.categoryId || (v as any).category_id].filter(Boolean);
        return categoryIds.some(id => (allowedCategoryIds as Set<string>)?.has(id) || isAdmin);
      })).filter(v => isSupportMaterial(v) && isContentReleased(v));

  const visibleCategories = isAdmin
    ? categories
    : categories.filter(c => (allowedCategoryIds as Set<string>).has(c.id) && isReleased(c));

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
    const byModules = (list: any[]) => {
      if (selectedModules.length === 0) return list;
      return list.filter(v => {
        const mid: string | undefined = (v as any).moduleId || (v as any).module_id;
        return mid ? selectedModules.includes(mid) : false;
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
    return order(byMinDuration(byStatus(byModules(byCats(byQuery(visibleVideos))))));
  }, [visibleVideos, debouncedQuery, selectedCategories, selectedModules, statusFilter, minDurationMin, orderBy, viewHistory]);

  // Handler de scroll depende de filteredVideos.length; declarar após a criação de filteredVideos
  useEffect(() => {
    const handler = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (atBottom) setVisibleCount(prev => Math.min(prev + 12, filteredVideos.length));
    };
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, [filteredVideos.length]);

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

  // Últimos assistidos — não confundir com o selo "Novo", que é sobre a data
  // de publicação. Eram dois sentidos de "recente" na mesma tela.
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <QuadroDeAvisos />
        {isLoading && (
          <div className="space-y-6">
            <SkeletonEstatisticas />
            <SkeletonCartoes />
          </div>
        )}
        {!isLoading && (<>
        {/* Faixa de boas-vindas, com retomada e acesso à administração */}
        <div className="rounded-lg bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-poppins text-2xl font-bold sm:text-3xl">
                Bem-vindo(a) de volta, {user?.name}!
              </h1>
              <p className="mt-1 text-sm opacity-90">
                Continue aprendendo e desenvolvendo suas habilidades
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {inProgressVideos[0]?.video && (
                <Button
                  variant="secondary"
                  onClick={() => handleVideoClick(inProgressVideos[0].video!.id)}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Retomar de onde parou
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => navigate('/mensagens')}
                className={naoLidas > 0 ? 'ring-2 ring-white/70' : undefined}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Falar com a administração
                {naoLidas > 0 && (
                  <span className="ml-2 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {naoLidas}
                  </span>
                )}
              </Button>
            </div>
          </div>
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
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="text-3xl font-bold leading-none">{stats.totalVideos}</div>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Total de Vídeos</p>
              <p className="text-xs text-muted-foreground/80">disponíveis para você</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="text-3xl font-bold leading-none">{stats.watchedVideos}</div>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Concluídos</p>
              <p className="text-xs text-muted-foreground/80">vídeos completos</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="text-3xl font-bold leading-none">{stats.inProgress}</div>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Em Progresso</p>
              <p className="text-xs text-muted-foreground/80">continue assistindo</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-sky-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="text-3xl font-bold leading-none">
                  {Math.floor(stats.totalWatchTime / 3600)}h
                </div>
                <Clock className="h-4 w-4 text-sky-600" />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tempo Total</p>
              <p className="text-xs text-muted-foreground/80">de aprendizado</p>
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
                      {/* módulo/submódulo */}
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
              {(selectedCategories.length > 0 || selectedModules.length > 0 || statusFilter !== 'all' || minDurationMin > 0) && (
                <button className="underline" onClick={() => { setSelectedCategories([]); setSelectedModules([]); setStatusFilter('all'); setMinDurationMin(0); setOrderBy('recent'); setModuleQuery(''); }}>limpar filtros</button>
              )}
            </div>

            {/* Filtro por Módulos/Submódulos */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-foreground">Módulos</span>
                <Input placeholder="Buscar módulos..." className="max-w-xs" value={moduleQuery} onChange={(e) => setModuleQuery(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  // Agregar módulos das categorias visíveis
                  const catIds = visibleCategories.map((c: any) => c.id);
                  const allMods = catIds.flatMap((cid: string) => (modulesByCategory[cid] || []) as Array<{ id: string; title: string; parentId?: string | null }>);
                  // Construir mapa para labels Parent > Child
                  const byId = new Map(allMods.map(m => [m.id, m] as const));
                  const toLabel = (m: any) => {
                    if (m.parentId) {
                      const parent = byId.get(m.parentId);
                      return parent ? `${parent.title} > ${m.title}` : m.title;
                    }
                    return m.title;
                  };
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
                {visibleCategories.length === 0 && (
                  <span className="text-xs text-muted-foreground">Nenhuma categoria visível</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Tabs */}
        <ErrorBoundary>
        <Tabs defaultValue="pastas" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="pastas">Pastas</TabsTrigger>
              <TabsTrigger value="all">Todos os Vídeos</TabsTrigger>
              <TabsTrigger value="recent">Continuar assistindo</TabsTrigger>
            </TabsList>
            
            <div className="flex flex-1 items-center gap-2 sm:flex-none">
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar vídeos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
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

          {/* O documento pede o critério de "vídeos recentes" às claras, com o
              número de dias — não escondido num tooltip do selo. */}
          <p className="text-xs text-muted-foreground">
            Aulas publicadas nos últimos <strong>{diasNovidade}</strong>{' '}
            {diasNovidade === 1 ? 'dia' : 'dias'} aparecem com o selo <em>Novo</em>.
            {' '}Em <em>Continuar assistindo</em> ficam as que você começou e não terminou.
          </p>

          {/* Navegação por pastas: abre só com os nomes, os vídeos vêm ao entrar */}
          <TabsContent value="pastas">
            <NavegadorDePastas
              categorias={visibleCategories as any}
              videos={visibleVideos as any}
              modulosPorCategoria={modulesByCategory as any}
              historico={viewHistory as any}
            />
          </TabsContent>

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
              ) : filteredVideos.slice(0, visibleCount).map(video => {
                const history = viewHistory.find(h => h.videoId === video.id);
                const progressPercentage = history ? (() => {
                  const total = Number(video.duration) || 0;
                  const raw = total > 0 ? (history.watchedDuration / total) * 100 : (history.completed ? 100 : 0);
                  return Math.max(0, Math.min(100, raw));
                })() : 0;
                const uploadedAt = new Date(video.uploadedAt || (video as any).created_at || 0);
                const isNew = (Date.now() - uploadedAt.getTime()) < (diasNovidade * 24 * 60 * 60 * 1000);

                return (
                  <VideoCard
                    key={video.id}
                    video={video}
                    progressPercentage={progressPercentage}
                    modulesByCategory={modulesByCategory}
                    categories={categories}
                    layout={viewMode}
                    onClick={handleVideoClick}
                    isFavorite={isFavorite(video.id)}
                    onToggleFavorite={toggleFavorite}
                    isNew={isNew}
                    diasNovidade={diasNovidade}
                    onResume={handleVideoClick}
                  />
                );
              })}
            </div>
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
                          {formatDurationLong(video.duration)}
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

        {/* Support Materials Section */}
        {supportMaterials.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Materiais de Apoio</CardTitle>
              <CardDescription>PDFs e documentos complementares das suas categorias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        </ErrorBoundary>
        </>)}
      </div>
    </Layout>
  );
}
