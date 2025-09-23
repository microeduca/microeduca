import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ViewHistory, User, Video } from '@/types';
import { getViewHistory, getUsers, getVideos } from '@/lib/storage';
import { Search, Clock, Eye, TrendingUp, UserCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function AdminViewerHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewHistory] = useState<ViewHistory[]>(getViewHistory());
  const [users] = useState<User[]>(getUsers());
  const [videos] = useState<Video[]>(getVideos());

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Usuário desconhecido';
  };

  const getUserEmail = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.email || '';
  };

  const getVideoTitle = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    return video?.title || 'Vídeo não encontrado';
  };

  const getVideoDuration = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    return video?.duration || 0;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateProgress = (watchedDuration: number, totalDuration: number) => {
    if (totalDuration === 0) return 0;
    return Math.min(100, Math.round((watchedDuration / totalDuration) * 100));
  };

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return viewHistory;
    
    const lowerSearch = searchTerm.toLowerCase();
    return viewHistory.filter(history => {
      const userName = getUserName(history.userId).toLowerCase();
      const userEmail = getUserEmail(history.userId).toLowerCase();
      const videoTitle = getVideoTitle(history.videoId).toLowerCase();
      
      return userName.includes(lowerSearch) || 
             userEmail.includes(lowerSearch) || 
             videoTitle.includes(lowerSearch);
    });
  }, [searchTerm, viewHistory]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalViews = viewHistory.length;
    const completedViews = viewHistory.filter(h => h.completed).length;
    const uniqueUsers = new Set(viewHistory.map(h => h.userId)).size;
    const totalWatchTime = viewHistory.reduce((acc, h) => acc + h.watchedDuration, 0);
    
    return {
      totalViews,
      completedViews,
      completionRate: totalViews > 0 ? Math.round((completedViews / totalViews) * 100) : 0,
      uniqueUsers,
      averageWatchTime: totalViews > 0 ? Math.round(totalWatchTime / totalViews) : 0,
    };
  }, [viewHistory]);

  // Get most watched videos
  const mostWatchedVideos = useMemo(() => {
    const videoViewCount = new Map<string, number>();
    
    viewHistory.forEach(history => {
      const count = videoViewCount.get(history.videoId) || 0;
      videoViewCount.set(history.videoId, count + 1);
    });
    
    return Array.from(videoViewCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([videoId, count]) => ({
        videoId,
        title: getVideoTitle(videoId),
        views: count,
      }));
  }, [viewHistory]);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total de Visualizações</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedViews} de {stats.totalViews} concluídos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.averageWatchTime)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Most Watched Videos */}
      <Card>
        <CardHeader>
          <CardTitle>Vídeos Mais Assistidos</CardTitle>
          <CardDescription>
            Top 5 vídeos com maior número de visualizações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mostWatchedVideos.map((video, index) => (
              <div key={video.videoId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium">{video.title}</span>
                </div>
                <Badge variant="secondary">{video.views} views</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Viewer History Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Histórico de Visualizações</CardTitle>
              <CardDescription>
                Acompanhe o progresso de cada usuário nos vídeos
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário ou vídeo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Vídeo</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Tempo Assistido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última Visualização</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((history) => {
                const videoDuration = getVideoDuration(history.videoId);
                const progress = calculateProgress(history.watchedDuration, videoDuration);
                
                return (
                  <TableRow key={history.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getUserName(history.userId)}</p>
                        <p className="text-sm text-muted-foreground">{getUserEmail(history.userId)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {getVideoTitle(history.videoId)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">{progress}%</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDuration(history.watchedDuration)} / {formatDuration(videoDuration)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={history.completed ? 'default' : 'secondary'}
                        className={history.completed ? 'bg-green-500/10 text-green-700 border-green-500/20' : ''}
                      >
                        {history.completed ? 'Concluído' : 'Em progresso'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(history.lastWatchedAt).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum histórico encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}