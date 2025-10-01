import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Play, Search, Calendar, Filter, BarChart3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getViewHistory, getVideos, getCategories } from "@/lib/storage";
import { ViewHistory, Video, Category } from "@/types";

export default function History() {
  const navigate = useNavigate();
  const [currentUser] = useState(getCurrentUser());
  const [history, setHistory] = useState<ViewHistory[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    (async () => {
      try {
        const [userHistory, videosList, categoriesList] = await Promise.all([
          getViewHistory(currentUser.id),
          getVideos(),
          getCategories(),
        ]);
        setHistory(userHistory);
        setVideos(videosList);
        setCategories(categoriesList);
      } catch (_e) {
        setHistory([]);
        setVideos([]);
        setCategories([]);
      }
    })();
  }, [currentUser, navigate]);

  const getVideo = (videoId: string) => {
    return videos.find(v => v.id === videoId);
  };

  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min ${secs}s`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Hoje";
    if (diffInDays === 1) return "Ontem";
    if (diffInDays < 7) return `${diffInDays} dias atrás`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} semanas atrás`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} meses atrás`;
    return `${Math.floor(diffInDays / 365)} anos atrás`;
  };

  const filteredAndSortedHistory = useMemo(() => {
    let filtered = [...history];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => {
        const video = getVideo(item.videoId);
        return video?.title.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter(item => {
        const video = getVideo(item.videoId);
        return video?.categoryId === filterCategory;
      });
    }

    // Status filter
    if (filterStatus === "completed") {
      filtered = filtered.filter(item => item.completed);
    } else if (filterStatus === "inProgress") {
      filtered = filtered.filter(item => !item.completed);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime();
        case "oldest":
          return new Date(a.lastWatchedAt).getTime() - new Date(b.lastWatchedAt).getTime();
        case "progress":
          const videoA = getVideo(a.videoId);
          const videoB = getVideo(b.videoId);
          const progressA = videoA && videoA.duration > 0 ? (a.watchedDuration / videoA.duration) * 100 : (a.completed ? 100 : 0);
          const progressB = videoB && videoB.duration > 0 ? (b.watchedDuration / videoB.duration) * 100 : (b.completed ? 100 : 0);
          return progressB - progressA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [history, searchTerm, filterCategory, filterStatus, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const totalWatched = history.length;
    const completedVideos = history.filter(h => h.completed).length;
    const totalWatchTime = history.reduce((acc, h) => acc + h.watchedDuration, 0);

    let sumPercent = 0;
    let count = 0;
    for (const h of history) {
      const video = getVideo(h.videoId);
      if (video && video.duration > 0) {
        sumPercent += (h.watchedDuration / video.duration) * 100;
        count += 1;
      } else {
        // Se não temos duração, usar completed como 100%, senão 0%
        sumPercent += h.completed ? 100 : 0;
        count += 1;
      }
    }
    const avg = count > 0 ? sumPercent / count : 0;
    const averageCompletion = Number.isFinite(avg) ? avg : 0;

    return {
      totalWatched,
      completedVideos,
      totalWatchTime,
      averageCompletion
    };
  }, [history]);

  const handleContinueWatching = (videoId: string) => {
    navigate(`/video/${videoId}`);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">Histórico de Visualização</h1>
          <p className="text-muted-foreground">
            Acompanhe seu progresso e continue de onde parou
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Vídeos Assistidos
              </CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWatched}</div>
              <p className="text-xs text-muted-foreground">
                Total de vídeos visualizados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Concluídos
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedVideos}</div>
              <p className="text-xs text-muted-foreground">
                Vídeos assistidos até o fim
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tempo Total
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(stats.totalWatchTime)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tempo total assistido
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Progresso Médio
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageCompletion.toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Média de conclusão
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar vídeo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="inProgress">Em Progresso</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais Recentes</SelectItem>
                  <SelectItem value="oldest">Mais Antigos</SelectItem>
                  <SelectItem value="progress">Maior Progresso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <div className="space-y-4">
          {filteredAndSortedHistory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum histórico encontrado</h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm || filterCategory !== "all" || filterStatus !== "all"
                    ? "Tente ajustar os filtros"
                    : "Comece a assistir vídeos para ver seu histórico aqui"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedHistory.map((item) => {
              const video = getVideo(item.videoId);
              const category = video ? getCategory(video.categoryId) : null;
              const progressPercentage = video && video.duration > 0
                ? Math.min((item.watchedDuration / video.duration) * 100, 100)
                : (item.completed ? 100 : 0);

              if (!video) return null;

              return (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Thumbnail */}
                      <div className="relative w-full md:w-48 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 bg-background/90 px-2 py-1 rounded text-xs">
                          {formatDuration(video.duration)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="text-lg font-semibold line-clamp-1">
                            {video.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {video.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {category && (
                            <Badge variant="secondary">
                              {category.name}
                            </Badge>
                          )}
                          {item.completed ? (
                            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                              Concluído
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Em Progresso
                            </Badge>
                          )}
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(item.lastWatchedAt)}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {formatDuration(item.watchedDuration)} de {formatDuration(video.duration)}
                            </span>
                            <span className="font-medium">
                              {progressPercentage.toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>

                        <Button
                          onClick={() => handleContinueWatching(video.id)}
                          className="w-full md:w-auto"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {item.completed ? "Assistir Novamente" : "Continuar Assistindo"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}