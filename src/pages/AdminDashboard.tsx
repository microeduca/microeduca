import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Users, Video, Eye, TrendingUp, Film, Play, CheckCircle2, Clock3, Settings, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { getRecentViews } from '@/lib/storage';
import { useQuery } from '@tanstack/react-query';
import { useCategorias, useHistorico, usePerfis, useVideos } from '@/hooks/queries';
import { SkeletonEstatisticas, SkeletonTabela } from '@/components/LoadingState';
import { formatDurationLong } from '@/lib/utils';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: users = [], isLoading: carregandoUsuarios } = usePerfis();
  const { data: videos = [] } = useVideos();
  const { data: categories = [] } = useCategorias();
  const { data: viewHistory = [] } = useHistorico();
  const { data: recentViews = [] } = useQuery({
    queryKey: ['views-recentes'],
    queryFn: () => getRecentViews(100),
    staleTime: 60 * 1000,
  });
  const carregando = carregandoUsuarios;
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const stats = {
    totalUsers: users.filter(u => u.role !== 'admin').length,
    totalVideos: videos.length,
    totalViews: viewHistory.length,
    totalWatchTime: viewHistory.reduce((acc, h) => acc + Math.max(0, Number(h.watchedDuration) || 0), 0),
    // Antes contava cadastros do dia sob o rótulo "Engajamento"; agora é
    // quem realmente assistiu algo nos últimos 7 dias.
    activeLastWeek: (() => {
      const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Set(
        viewHistory
          .filter(h => new Date(h.lastWatchedAt).getTime() >= limite)
          .map(h => h.userId)
      ).size;
    })(),
  };

  const userRanking = users
    .filter((u) => u.role !== 'admin')
    .map((user) => {
      const entries = viewHistory.filter((h) => h.userId === user.id);
      return {
        user,
        views: entries.length,
        completed: entries.filter((h) => h.completed).length,
        watched: entries.reduce((acc, h) => acc + Math.max(0, Number(h.watchedDuration) || 0), 0),
      };
    })
    .sort((a, b) => b.watched - a.watched || b.views - a.views)
    .slice(0, 5);

  const contentRanking = videos
    .map((video) => {
      const entries = viewHistory.filter((h) => h.videoId === video.id);
      return {
        video,
        views: entries.length,
        watched: entries.reduce((acc, h) => acc + Math.max(0, Number(h.watchedDuration) || 0), 0),
      };
    })
    .sort((a, b) => b.views - a.views || b.watched - a.watched)
    .slice(0, 5);

  const dailyEvolution = Object.entries(
    viewHistory.reduce((acc: Record<string, number>, h) => {
      const key = new Date(h.lastWatchedAt).toLocaleDateString('pt-BR');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).slice(-7);

  const getVimeoThumbFallback = (v: any): string | null => {
    const id = v?.vimeoId || v?.vimeo_id || (v?.videoUrl || v?.video_url)?.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    return id ? `https://vumbnail.com/${id}.jpg` : null;
  };

  const getThumb = (v: any): string => v?.thumbnail || getVimeoThumbFallback(v) || '/placeholder.svg';

  const sourceHistory = (recentViews && recentViews.length > 0) ? recentViews : viewHistory;
  const filteredHistory = sourceHistory.filter((vh) => {
    const userOk = selectedUserId === 'all' || vh.userId === selectedUserId;
    const video = videos.find(v => v.id === vh.videoId);
    const catId = vh.videoCategoryId || video?.categoryId;
    const catOk = selectedCategoryId === 'all' || catId === selectedCategoryId;
    return userOk && catOk;
  });
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    const aT = new Date(a.lastWatchedAt).getTime();
    const bT = new Date(b.lastWatchedAt).getTime();
    return bT - aT;
  });
  const totalPages = Math.max(1, Math.ceil(sortedHistory.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sortedHistory.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-poppins font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">
              Gerencie vídeos, usuários e acompanhe o engajamento da plataforma
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin/relatorios')} variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Relatórios
            </Button>
            <Button onClick={() => navigate('/admin/settings')} variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
            <Button onClick={() => navigate('/admin/videos')} className="gap-2">
              <Film className="h-4 w-4" />
              Gerenciar Vídeos
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Colaboradores cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total de Vídeos</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVideos}</div>
              <p className="text-xs text-muted-foreground">
                Vídeos disponíveis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews}</div>
              <p className="text-xs text-muted-foreground">
                Total de visualizações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Engajamento</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeLastWeek}</div>
              <p className="text-xs text-muted-foreground">
                Usuários ativos em 7 dias
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usuários mais ativos</CardTitle>
              <CardDescription>Ranking por horas consumidas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {userRanking.map((item, index) => (
                <div key={item.user.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{index + 1}. {item.user.name}</p>
                    <p className="text-xs text-muted-foreground">{item.views} acesso(s), {item.completed} concluído(s)</p>
                  </div>
                  <Badge variant="outline">{formatDurationLong(item.watched)}</Badge>
                </div>
              ))}
              {userRanking.length === 0 && <p className="text-sm text-muted-foreground">Sem dados de uso ainda.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conteúdos mais acessados</CardTitle>
              <CardDescription>Ranking por visualizações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {contentRanking.map((item, index) => (
                <div key={item.video.id} className="flex items-center justify-between gap-3">
                  <button className="min-w-0 text-left" onClick={() => navigate(`/video/${item.video.id}`)}>
                    <p className="truncate text-sm font-medium hover:underline">{index + 1}. {item.video.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDurationLong(item.watched)} consumidos</p>
                  </button>
                  <Badge variant="secondary">{item.views} views</Badge>
                </div>
              ))}
              {contentRanking.length === 0 && <p className="text-sm text-muted-foreground">Sem visualizações registradas.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução de acessos</CardTitle>
              <CardDescription>Últimos dias com atividade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">Horas consumidas</p>
                <p className="text-2xl font-bold">{formatDurationLong(stats.totalWatchTime)}</p>
              </div>
              {dailyEvolution.map(([day, count]) => (
                <div key={day} className="flex items-center justify-between text-sm">
                  <span>{day}</span>
                  <Badge variant="outline">{count} acesso(s)</Badge>
                </div>
              ))}
              {dailyEvolution.length === 0 && <p className="text-sm text-muted-foreground">Sem evolução disponível.</p>}
            </CardContent>
          </Card>
        </div>

        {/* Recent Views */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Últimas visualizações</CardTitle>
              <div className="flex items-center gap-2">
                <div className="min-w-[220px]">
                  <Select value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v); setPage(1); }}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Filtrar por usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[220px]">
                  <Select value={selectedCategoryId} onValueChange={(v) => { setSelectedCategoryId(v); setPage(1); }}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Filtrar por categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <CardDescription>Quem assistiu o quê recentemente</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Vídeo</TableHead>
                  <TableHead>Quando</TableHead>
                  <TableHead>Assistido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[1%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems
                  .map((vh) => {
                    const user = users.find(u => u.id === vh.userId);
                    const video = videos.find(v => v.id === vh.videoId);
                    const rowCompleted = !!vh.completed;
                    const displayUser = vh.userName || user?.name || 'Usuário';
                    const displayTitle = vh.videoTitle || video?.title || vh.videoId;
                    const displayThumb = vh.videoThumbnail || (video ? getThumb(video) : (vh.videoVimeoId ? `https://vumbnail.com/${vh.videoVimeoId}.jpg` : (vh.videoUrl ? (vh.videoUrl.match(/vimeo\\.com\/(?:video\/)?(\d+)/)?.[1] ? `https://vumbnail.com/${vh.videoUrl.match(/vimeo\\.com\/(?:video\/)?(\d+)/)?.[1]}.jpg` : '/placeholder.svg') : '/placeholder.svg')));
                    return (
                      <TableRow key={vh.id} className={rowCompleted ? 'bg-green-50/50 dark:bg-green-950/20' : ''}>
                        <TableCell className="font-medium">{displayUser}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-16 aspect-video overflow-hidden rounded bg-muted">
                              <img src={displayThumb} alt={displayTitle} className="w-full h-full object-cover" />
                            </div>
                            <button
                              className="text-left hover:underline"
                              onClick={() => navigate(`/video/${video?.id || vh.videoId}`)}
                            >
                              {displayTitle}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(vh.lastWatchedAt).toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{formatDurationLong(vh.watchedDuration || 0)}</TableCell>
                        <TableCell>
                          {rowCompleted ? (
                            <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1"><Clock3 className="h-3 w-3" /> Parcial</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/video/${video?.id || vh.videoId}`)}>
                            <Play className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {sortedHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">Sem visualizações recentes</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {/* Pagination */}
            {sortedHistory.length > 0 && (
              <div className="flex items-center justify-between mt-3 text-sm">
                <span className="text-muted-foreground">Página {currentPage} de {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
