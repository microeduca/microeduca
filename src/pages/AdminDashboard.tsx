import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, Video, Eye, TrendingUp, History, Upload, Film, Play, CheckCircle2, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { getUsers, getVideos, getViewHistory, getRecentViews } from '@/lib/storage';
import AdminVideoManagement from '@/components/admin/AdminVideoManagement';
import AdminUserManagement from '@/components/admin/AdminUserManagement';
import AdminViewerHistory from '@/components/admin/AdminViewerHistory';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [viewHistory, setViewHistory] = useState<any[]>([]);
  const [recentViews, setRecentViews] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    (async () => {
      const [u, v, vh, rv] = await Promise.all([
        getUsers(),
        getVideos(),
        getViewHistory(),
        getRecentViews(100),
      ]);
      setUsers(u);
      setVideos(v);
      setViewHistory(vh);
      setRecentViews(rv || []);
    })();
  }, []);

  const stats = {
    totalUsers: users.filter(u => u.role !== 'admin').length,
    totalVideos: videos.length,
    totalViews: viewHistory.length,
    activeToday: users.filter(u => {
      const today = new Date().toDateString();
      return new Date(u.createdAt).toDateString() === today;
    }).length,
  };

  const getVimeoThumbFallback = (v: any): string | null => {
    const id = v?.vimeoId || v?.vimeo_id || (v?.videoUrl || v?.video_url)?.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    return id ? `https://vumbnail.com/${id}.jpg` : null;
  };

  const getThumb = (v: any): string => v?.thumbnail || getVimeoThumbFallback(v) || '/placeholder.svg';
  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const sourceHistory = (recentViews && recentViews.length > 0) ? recentViews : viewHistory;
  const filteredHistory = sourceHistory.filter((vh) => {
    const userOk = selectedUserId === 'all' || vh.userId === selectedUserId;
    const video = videos.find(v => v.id === vh.videoId);
    const catId = vh.videoCategoryId || video?.categoryId || video?.category_id;
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
          <Button onClick={() => navigate('/admin/videos')} className="gap-2">
            <Film className="h-4 w-4" />
            Gerenciar Vídeos
          </Button>
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
              <div className="text-2xl font-bold">{stats.activeToday}</div>
              <p className="text-xs text-muted-foreground">
                Novos usuários hoje
              </p>
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
                      {Array.from(new Set(videos.map(v => v.categoryId).filter(Boolean))).map((cid: any) => (
                        <SelectItem key={cid} value={cid}>
                          {cid}
                        </SelectItem>
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
                        <TableCell>{formatTime(vh.watchedDuration || 0)}</TableCell>
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

        {/* Management Tabs */}
        <Tabs defaultValue="videos" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
            <TabsTrigger value="videos">
              <Video className="h-4 w-4 mr-2" />
              Vídeos
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-4">
            <AdminVideoManagement />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <AdminViewerHistory />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}