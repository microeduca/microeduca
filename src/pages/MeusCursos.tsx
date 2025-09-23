import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { getCategories, getVideos, getViewHistory } from '@/lib/storage';
import { Category, Video as VideoType } from '@/types';

export default function MeusCursos() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [categories] = useState(getCategories());
  const [videos] = useState(getVideos());
  const [viewHistory] = useState(getViewHistory(user?.id));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
  const userVideos = videos.filter(video => 
    user?.assignedCategories?.includes(video.categoryId)
  );

  // Calcular estatísticas por categoria
  const getCategoryStats = (categoryId: string) => {
    const categoryVideos = videos.filter(v => v.categoryId === categoryId);
    const watchedVideos = viewHistory.filter(h => 
      categoryVideos.some(v => v.id === h.videoId) && h.completed
    );
    const inProgressVideos = viewHistory.filter(h => 
      categoryVideos.some(v => v.id === h.videoId) && !h.completed && h.watchedDuration > 0
    );

    return {
      totalVideos: categoryVideos.length,
      completed: watchedVideos.length,
      inProgress: inProgressVideos.length,
      percentage: categoryVideos.length > 0 
        ? Math.round((watchedVideos.length / categoryVideos.length) * 100)
        : 0
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
                  const categoryVideos = videos.filter(v => v.categoryId === category.id);
                  
                  return (
                    <Card 
                      key={category.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                      onClick={() => handleCategoryClick(category.id)}
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

                        <Button 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (categoryVideos.length > 0) {
                              handleVideoClick(categoryVideos[0].id);
                            }
                          }}
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          {stats.inProgress > 0 ? 'Continuar' : 'Iniciar Curso'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* List View */}
            <TabsContent value="list" className="space-y-4">
              {userCategories.map(category => {
                const stats = getCategoryStats(category.id);
                const categoryVideos = videos.filter(v => v.categoryId === category.id);
                
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
                          <Button
                            onClick={() => {
                              if (categoryVideos.length > 0) {
                                handleVideoClick(categoryVideos[0].id);
                              }
                            }}
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Acessar
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

                        {/* Lista de vídeos do curso */}
                        {selectedCategory === category.id && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-medium mb-3">Vídeos do Curso:</h4>
                            <div className="space-y-2">
                              {categoryVideos.map(video => {
                                const history = viewHistory.find(h => h.videoId === video.id);
                                
                                return (
                                  <div 
                                    key={video.id}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                                    onClick={() => handleVideoClick(video.id)}
                                  >
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
                                        <p className="text-xs text-muted-foreground">
                                          {formatDuration(video.duration)}
                                        </p>
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                      Assistir
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
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