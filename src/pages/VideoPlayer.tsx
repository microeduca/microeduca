import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Maximize, 
  ChevronLeft, 
  ChevronRight,
  MessageCircle,
  Clock,
  User,
  Send
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { 
  getVideos, 
  getCategories, 
  saveVideoProgress, 
  addToHistory, 
  getComments, 
  addComment, 
  deleteComment,
  updateVideo,
  getVideoProgress as getVideoProgressApi
} from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import VimeoPlayer from '@/components/VimeoPlayer';

function extractVimeoId(url?: string | null): string | undefined {
  if (!url) return undefined;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1];
}

export default function VideoPlayer() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getCurrentUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [video, setVideo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const [vList, cList] = await Promise.all([getVideos(), getCategories()]);
      setVideos(vList);
      setCategories(cList);
      const v = vList.find(v => v.id === videoId);
      setVideo(v || null);
      if (v) {
        setEditTitle(v.title || '');
        setEditDescription(v.description || '');
        setEditCategoryId(v.categoryId || '');
        setEditThumbnail(v.thumbnail);
      }
      // Carregar progresso salvo para retomar do ponto
      const vp = await getVideoProgressApi(videoId || '');
      if (vp) {
        if (vp.completed) {
          setIsCompleted(true);
          setMaxProgress(100);
          setProgress(100);
          if (vp.currentTime > 0) setCurrentTime(vp.currentTime);
        } else if (vp.currentTime > 0 && vp.duration > 0) {
          const initial = Math.min(100, Math.max(0, (vp.currentTime / vp.duration) * 100));
          setMaxProgress(initial);
          setProgress(initial);
          setCurrentTime(vp.currentTime);
        }
      }
      setComments(await getComments(videoId || ''));
      setIsLoading(false);
    })();
  }, [videoId]);
  const [newComment, setNewComment] = useState('');
  const getInitials = (name?: string) => {
    const base = (name || '').trim();
    if (!base) return '?';
    const parts = base.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [maxProgress, setMaxProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [viewRegistered, setViewRegistered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editThumbnail, setEditThumbnail] = useState<string | undefined>(undefined);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const category = categories.find(c => c.id === video?.categoryId);
  const relatedVideos = videos.filter(v => v.categoryId === video?.categoryId && v.id !== video?.id);
  const vimeoIdFromUrl = extractVimeoId(video?.videoUrl);
  const isPdf = (video?.videoUrl || '').endsWith('.pdf') || (video?.videoUrl || '').includes('/api/files') && /application\/pdf/i.test('');
  const isImage = (video?.videoUrl || '').match(/\.(jpg|jpeg|png)$/i);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!video) return;

    // Registrar visualização após 3 segundos de exibição
    const viewTimer = setTimeout(() => {
      if (!viewRegistered) {
        addToHistory({
          userId: user.id,
          videoId: video.id,
          watchedDuration: 0,
          completed: false,
          lastWatchedAt: new Date(),
        });
        setViewRegistered(true);
        
        toast({
          title: "Visualização registrada",
          description: "Sua visualização foi contabilizada.",
        });
      }
    }, 3000);

    return () => clearTimeout(viewTimer);
  }, [video, user, navigate, viewRegistered, toast]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
      const computed = (videoElement.currentTime / (videoElement.duration || duration || 1)) * 100;
      const clamped = Math.min(100, Math.max(0, computed));
      setMaxProgress((prev) => Math.max(prev, clamped, isCompleted ? 100 : 0));
      setProgress((prev) => Math.max(prev, clamped, isCompleted ? 100 : 0));
      // Salvar progresso a cada 5 segundos sem regredir
      if (Math.floor(videoElement.currentTime) % 5 === 0) {
        saveProgress();
      }
    };

    const handleLoadedMetadata = async () => {
      setDuration(videoElement.duration);
      // Retomar posição salva se houver
      try {
        const vp = await getVideoProgressApi(videoId || '');
        if (vp && vp.currentTime > 0) {
          videoElement.currentTime = Math.max(0, Math.min(videoElement.duration - 1, vp.currentTime));
          setCurrentTime(videoElement.currentTime);
          const computedLoaded = (videoElement.currentTime / (videoElement.duration || 1)) * 100;
          const clampedLoaded = Math.min(100, Math.max(0, computedLoaded));
          setMaxProgress((prev) => Math.max(prev, clampedLoaded, isCompleted ? 100 : 0));
          setProgress((prev) => Math.max(prev, clampedLoaded, isCompleted ? 100 : 0));
        }
      } catch {}
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (user && video) {
        setIsCompleted(true);
        setMaxProgress(100);
        setProgress(100);
        addToHistory({
          userId: user.id,
          videoId: video.id,
          watchedDuration: video.duration,
          completed: true,
          lastWatchedAt: new Date(),
        });
        toast({
          title: "Vídeo concluído!",
          description: "Parabéns por completar este vídeo.",
        });
      }
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, [user, video, toast, videoId, duration, isCompleted]);

  // Salvar progresso periodicamente para vídeos Vimeo
  useEffect(() => {
    if (!video?.vimeoId && !video?.vimeoEmbedUrl) return;
    
    const progressInterval = setInterval(() => {
      // Para vídeos Vimeo, salvar progresso estimado
      if (user && video) {
        const estimatedProgress = Math.min(progress + 1, 100);
        setProgress(estimatedProgress);
        
        const estimatedWatchTime = Math.floor((estimatedProgress / 100) * video.duration);
        
        addToHistory({
          userId: user.id,
          videoId: video.id,
          watchedDuration: estimatedWatchTime,
          completed: estimatedProgress >= 95,
          lastWatchedAt: new Date(),
        });

        if (estimatedProgress >= 95 && !viewRegistered) {
          toast({
            title: "Vídeo concluído!",
            description: "Parabéns por completar este vídeo.",
          });
          setViewRegistered(true);
        }
      }
    }, 10000); // Atualizar a cada 10 segundos

    return () => clearInterval(progressInterval);
  }, [video, user, progress, viewRegistered, toast]);

  const saveProgress = () => {
    if (!video || !user || !videoRef.current) return;
    
    saveVideoProgress({
      videoId: video.id,
      currentTime: videoRef.current.currentTime,
      duration: video.duration,
      completed: false,
    });

    addToHistory({
      userId: user.id,
      videoId: video.id,
      watchedDuration: Math.floor(videoRef.current.currentTime),
      completed: false,
      lastWatchedAt: new Date(),
    });
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
  };

  const handleSkipForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    videoRef.current.currentTime = percentage * duration;
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    try {
      const created = await addComment({
        videoId: videoId || '',
        userId: user.id,
        userName: user.name,
        content: newComment,
      });
      // Garantir userName no estado local
      const withName = { ...created, userName: user.name } as any;
      setComments([...comments, withName]);
      setNewComment('');
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi publicado com sucesso.",
      });
    } catch (e) {
      toast({
        title: 'Erro ao comentar',
        description: 'Não foi possível publicar seu comentário.',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">Carregando vídeo...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!video) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">Vídeo não encontrado.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="hover:text-foreground transition-colors"
          >
            Dashboard
          </button>
          <ChevronRight className="h-4 w-4" />
          <span>{category?.name}</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{video.title}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <Card className="overflow-hidden">
              <div className="relative bg-black aspect-video">
                {isPdf ? (
                  <iframe src={video.videoUrl} className="absolute inset-0 w-full h-full" title={video.title} />
                ) : isImage ? (
                  <img src={video.videoUrl} alt={video.title} className="absolute inset-0 w-full h-full object-contain bg-black" />
                ) : (video.vimeoEmbedUrl || video.vimeoId || vimeoIdFromUrl) ? (
                  <VimeoPlayer
                    vimeoId={video.vimeoId || vimeoIdFromUrl}
                    vimeoEmbedUrl={video.vimeoEmbedUrl}
                    title={video.title}
                    startAtSeconds={currentTime}
                    onProgress={(progressPercent, duration) => {
                      const clamped = Math.min(100, Math.max(0, progressPercent));
                      setMaxProgress((prev) => Math.max(prev, clamped, isCompleted ? 100 : 0));
                      setProgress((prev) => Math.max(prev, clamped, isCompleted ? 100 : 0));
                      setDuration(duration);
                      // Salvar progresso
                      const watchedDuration = Math.floor((Math.max(clamped, isCompleted ? 100 : 0) / 100) * duration);
                      if (user && video) {
                        saveVideoProgress({
                          videoId: video.id,
                          currentTime: watchedDuration,
                          duration: duration,
                          completed: isCompleted || clamped >= 95,
                        });
                        addToHistory({
                          userId: user.id,
                          videoId: video.id,
                          watchedDuration,
                          completed: isCompleted || clamped >= 95,
                          lastWatchedAt: new Date(),
                        });
                      }
                    }}
                    onComplete={() => {
                      if (user && video) {
                        setIsCompleted(true);
                        setMaxProgress(100);
                        setProgress(100);
                        addToHistory({
                          userId: user.id,
                          videoId: video.id,
                          watchedDuration: video.duration,
                          completed: true,
                          lastWatchedAt: new Date(),
                        });
                        toast({
                          title: "Vídeo concluído!",
                          description: "Parabéns por completar este vídeo.",
                        });
                      }
                    }}
                    onPlay={() => {
                      if (!viewRegistered && user && video) {
                        addToHistory({
                          userId: user.id,
                          videoId: video.id,
                          watchedDuration: 0,
                          completed: false,
                          lastWatchedAt: new Date(),
                        });
                        setViewRegistered(true);
                      }
                    }}
                    className="w-full h-full"
                  />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      src={video.videoUrl}
                      className="w-full h-full"
                      onClick={togglePlay}
                    />
                    
                    {/* Video Controls */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      {/* Progress Bar */}
                      <div 
                        className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-3"
                        onClick={handleProgressClick}
                      >
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            onClick={togglePlay}
                          >
                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                          </Button>
                          
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            onClick={handleSkipBack}
                          >
                            <SkipBack className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            onClick={handleSkipForward}
                          >
                            <SkipForward className="h-4 w-4" />
                          </Button>
                          
                          <span className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-4 w-4 text-white" />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-20"
                          />
                          
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-white hover:bg-white/20"
                            onClick={handleFullscreen}
                          >
                            <Maximize className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Video Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    {isEditing && user?.role === 'admin' ? (
                      <div className="space-y-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Título do vídeo"
                        />
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                          placeholder="Descrição do vídeo"
                        />
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-2xl">{video.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {video.description}
                        </CardDescription>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing && user?.role === 'admin' ? (
                      <div className="min-w-[220px]">
                        <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Badge>{category?.name}</Badge>
                    )}
                    {user?.role === 'admin' && (
                      isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={async () => {
                              if (!video) return;
                              try {
                                await updateVideo({
                                  ...video,
                                  title: editTitle,
                                  description: editDescription,
                                  categoryId: editCategoryId || video.categoryId,
                                  thumbnail: editThumbnail,
                                } as any);
                                setVideo({ ...video, title: editTitle, description: editDescription, categoryId: editCategoryId || video.categoryId, thumbnail: editThumbnail });
                                setIsEditing(false);
                                toast({ title: 'Vídeo atualizado' });
                              } catch (e) {
                                toast({ title: 'Erro ao salvar', variant: 'destructive' });
                              }
                            }}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditTitle(video.title || '');
                              setEditDescription(video.description || '');
                              setEditCategoryId(video.categoryId || '');
                              setEditThumbnail(video.thumbnail);
                              setIsEditing(false);
                            }}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                          Editar
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {Math.floor(video.duration / 60)} minutos
                  </span>
                  <span>
                    Enviado em {new Date(video.uploadedAt).toLocaleDateString('pt-BR')}
                  </span>
                  {/* Botão Próximo vídeo */}
                  <Button
                    size="sm"
                    onClick={() => {
                      const sameCat = videos.filter(v => v.categoryId === video.categoryId && v.id !== video.id);
                      if (sameCat.length > 0) {
                        const next = sameCat[0];
                        navigate(`/video/${next.id}`);
                      }
                    }}
                  >
                    Próximo vídeo
                  </Button>
                  {user?.role === 'admin' && isEditing && (
                    <div className="ml-auto flex items-center gap-3">
                      <input
                        ref={thumbInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditThumbnail(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <Button size="sm" variant="outline" onClick={() => thumbInputRef.current?.click()}>
                        Alterar thumbnail
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Comentários ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment */}
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Adicione um comentário..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Enviar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials((comment as any).userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{(comment as any).userName || 'Usuário'}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                            {/* Admin delete */}
                            {user?.role === 'admin' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await deleteComment(comment.id);
                                    setComments((prev) => prev.filter((c) => c.id !== comment.id));
                                    toast({ title: 'Comentário removido' });
                                  } catch (e) {
                                    toast({ title: 'Erro ao excluir comentário', variant: 'destructive' });
                                  }
                                }}
                                className="ml-2 text-xs text-destructive hover:underline"
                              >
                                excluir
                              </button>
                            )}
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Seja o primeiro a comentar!
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Seu Progresso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground">
                  {Math.round(progress)}% concluído
                </p>
              </CardContent>
            </Card>

            {/* Related Videos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vídeos Relacionados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedVideos.slice(0, 5).map(relatedVideo => (
                  <div 
                    key={relatedVideo.id}
                    className="flex gap-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
                    onClick={() => navigate(`/video/${relatedVideo.id}`)}
                  >
                    <div className="aspect-video w-32 flex-shrink-0">
                      {relatedVideo.thumbnail ? (
                        <img 
                          src={relatedVideo.thumbnail} 
                          alt={relatedVideo.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center rounded">
                          <Play className="h-6 w-6 text-primary/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium line-clamp-2">{relatedVideo.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.floor(relatedVideo.duration / 60)} min
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}