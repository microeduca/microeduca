import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  addComment 
} from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

export default function VideoPlayer() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getCurrentUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [video] = useState(() => getVideos().find(v => v.id === videoId));
  const [categories] = useState(getCategories());
  const [videos] = useState(getVideos());
  const [comments, setComments] = useState(getComments(videoId || ''));
  const [newComment, setNewComment] = useState('');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);

  const category = categories.find(c => c.id === video?.categoryId);
  const relatedVideos = videos.filter(v => v.categoryId === video?.categoryId && v.id !== video?.id);

  useEffect(() => {
    if (!video || !user) {
      navigate('/dashboard');
      return;
    }

    // Registrar visualização
    addToHistory({
      userId: user.id,
      videoId: video.id,
      watchedDuration: 0,
      completed: false,
      lastWatchedAt: new Date(),
    });
  }, [video, user, navigate]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
      setProgress((videoElement.currentTime / videoElement.duration) * 100);
      
      // Salvar progresso a cada 5 segundos
      if (Math.floor(videoElement.currentTime) % 5 === 0) {
        saveProgress();
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (user && video) {
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
  }, [user, video, toast]);

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

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;
    
    const comment = addComment({
      videoId: videoId || '',
      userId: user.id,
      userName: user.name,
      content: newComment,
    });
    
    setComments([...comments, comment]);
    setNewComment('');
    
    toast({
      title: "Comentário adicionado",
      description: "Seu comentário foi publicado com sucesso.",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
                {video.vimeoEmbedUrl ? (
                  <iframe
                    src={video.vimeoEmbedUrl}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
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
                  <div>
                    <CardTitle className="text-2xl">{video.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {video.description}
                    </CardDescription>
                  </div>
                  <Badge>{category?.name}</Badge>
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
                            {comment.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{comment.userName}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString('pt-BR')}
                            </span>
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