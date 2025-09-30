import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, CheckCircle, BookOpen, TrendingUp, Grid, List, Search } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getCategories, getVideos, getViewHistory } from '@/lib/storage';
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
  
  // Filtrar vídeos com base na busca
  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calcular estatísticas do usuário
  const stats = {
    totalVideos: videos.length,
    watchedVideos: viewHistory.filter(h => h.completed).length,
    inProgress: viewHistory.filter(h => !h.completed).length,
    totalWatchTime: viewHistory.reduce((acc, h) => acc + h.watchedDuration, 0),
  };

  // Vídeos recentes (últimos assistidos)
  const recentVideos = viewHistory
    .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
    .slice(0, 6)
    .map(h => videos.find(v => v.id === h.videoId))
    .filter(Boolean);

  // Vídeos em progresso
  const inProgressVideos = viewHistory
    .filter(h => !h.completed && h.watchedDuration > 0)
    .map(h => ({
      video: videos.find(v => v.id === h.videoId),
      progress: (h.watchedDuration / (videos.find(v => v.id === h.videoId)?.duration || 1)) * 100
    }))
    .filter(item => item.video);

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
        {inProgressVideos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Continue Assistindo</CardTitle>
              <CardDescription>
                Retome de onde você parou
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inProgressVideos.slice(0, 3).map(({ video, progress }) => video && (
                  <Card 
                    key={video.id} 
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
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
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold line-clamp-1">{video.title}</h3>
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
              {filteredVideos.map(video => {
                const history = viewHistory.find(h => h.videoId === video.id);
                const progressPercentage = history 
                  ? (history.watchedDuration / video.duration) * 100 
                  : 0;

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
                      <CardTitle className="text-base line-clamp-1">{video.title}</CardTitle>
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
                        <Badge variant="secondary" className="text-xs">
                          {categories.find(c => c.id === (video.categoryId || video.category_id))?.name || 'Sem categoria'}
                        </Badge>
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
            {categories.map(category => {
              const categoryVideos = filteredVideos.filter(v => (v.categoryId || v.category_id) === category.id);
              
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