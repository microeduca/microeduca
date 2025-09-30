import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Video, Play, Edit2, Trash2, MoreVertical, Upload, Film, Clock, Image, Cloud, Search, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getVideos, addVideo, updateVideo, deleteVideo, getCategories, getViewHistory } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import VimeoUpload from '@/components/admin/VimeoUpload';

export default function AdminVideos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVimeoUploadOpen, setIsVimeoUploadOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [viewsMap, setViewsMap] = useState<Record<string, number>>({});
  const [previewVideo, setPreviewVideo] = useState<any | null>(null);
  
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    videoUrl: '',
    categoryId: '',
    duration: 0,
    thumbnail: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [videosData, categoriesData, viewHistory] = await Promise.all([
      getVideos(),
      getCategories(),
      getViewHistory(),
    ]);
    setVideos(videosData);
    setCategories(categoriesData);
    // construir mapa de views por videoId
    const temp: Record<string, number> = {};
    for (const vh of viewHistory) {
      temp[vh.videoId] = (temp[vh.videoId] || 0) + 1;
    }
    setViewsMap(temp);
    setLoading(false);
  };

  const handleAddVideo = async () => {
    if (!newVideo.title || !newVideo.videoUrl || !newVideo.categoryId) {
      toast({
        title: "Erro ao adicionar vídeo",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addVideo({
        title: newVideo.title,
        description: newVideo.description,
        video_url: newVideo.videoUrl,
        thumbnail: newVideo.thumbnail || undefined,
        category_id: newVideo.categoryId,
        duration: newVideo.duration,
        uploaded_by: 'admin',
      });

      await loadData();
      setIsAddDialogOpen(false);
      setNewVideo({
        title: '',
        description: '',
        videoUrl: '',
        categoryId: '',
        duration: 0,
        thumbnail: ''
      });

      toast({
        title: "Vídeo adicionado",
        description: "O vídeo foi adicionado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao adicionar vídeo",
        description: "Ocorreu um erro ao cadastrar o vídeo.",
        variant: "destructive",
      });
    }
  };
  
  const handleVimeoUploadComplete = async () => {
    await loadData();
    setIsVimeoUploadOpen(false);
    toast({
      title: "Vídeo do Vimeo adicionado",
      description: "O vídeo foi enviado para o Vimeo e adicionado à plataforma.",
    });
  };

  const handleUpdateVideo = async () => {
    if (!editingVideo) return;

    try {
      await updateVideo(editingVideo.id, {
        title: editingVideo.title,
        description: editingVideo.description,
        video_url: editingVideo.video_url || editingVideo.videoUrl,
        thumbnail: editingVideo.thumbnail,
        category_id: editingVideo.category_id || editingVideo.categoryId,
        duration: editingVideo.duration,
      });
      
      await loadData();
      setIsEditDialogOpen(false);
      setEditingVideo(null);

      toast({
        title: "Vídeo atualizado",
        description: "As informações do vídeo foram atualizadas.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar vídeo",
        description: "Ocorreu um erro ao atualizar o vídeo.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (confirm('Tem certeza que deseja excluir este vídeo?')) {
      try {
        await deleteVideo(videoId);
        await loadData();
        
        toast({
          title: "Vídeo excluído",
          description: "O vídeo foi removido da plataforma.",
        });
      } catch (error) {
        toast({
          title: "Erro ao excluir vídeo",
          description: "Ocorreu um erro ao remover o vídeo.",
          variant: "destructive",
        });
      }
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isEdit && editingVideo) {
          setEditingVideo({ ...editingVideo, thumbnail: base64String });
        } else {
          setNewVideo({ ...newVideo, thumbnail: base64String });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const safeFormatDate = (value: any) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  };

  const computeVimeoEmbed = (video: any): string | null => {
    if (!video) return null;
    if (video.vimeo_embed_url) return String(video.vimeo_embed_url);
    if (video.vimeo_id) return `https://player.vimeo.com/video/${video.vimeo_id}`;
    const url: string | undefined = video.video_url || video.videoUrl;
    const match = url?.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (match?.[1]) return `https://player.vimeo.com/video/${match[1]}`;
    return null;
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-poppins font-bold">Gerenciar Vídeos</h1>
            <p className="text-muted-foreground">
              Adicione e gerencie os vídeos de treinamento da plataforma
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/vimeo-upload')}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Vimeo
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Vídeo
            </Button>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative md:w-1/2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="md:w-1/3">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total de Vídeos</CardTitle>
                <Film className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{videos.length}</div>
              <p className="text-xs text-muted-foreground">vídeos disponíveis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Categorias</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-muted-foreground">categorias ativas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Duração Total</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(videos.reduce((acc, v) => acc + v.duration, 0) / 60)}h
              </div>
              <p className="text-xs text-muted-foreground">de conteúdo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Vídeos Vimeo</CardTitle>
                <Image className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {videos.filter(v => v.vimeo_id).length}
              </div>
              <p className="text-xs text-muted-foreground">integrados com Vimeo</p>
            </CardContent>
          </Card>
        </div>

        {/* Videos Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Vídeos</CardTitle>
            <CardDescription>
              Todos os vídeos disponíveis na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thumb</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Upload</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos
                  .filter(v => (filterCategory && filterCategory !== 'all' ? (v.category_id || v.categoryId) === filterCategory : true))
                  .filter(v => (search ? (v.title || '').toLowerCase().includes(search.toLowerCase()) : true))
                  .map(video => (
                  <TableRow key={video.id}>
                    <TableCell>
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.title} className="h-10 w-16 object-cover rounded" />
                      ) : (
                        <div className="h-10 w-16 bg-muted rounded" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{video.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getCategoryName(video.category_id || video.categoryId)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDuration(video.duration)}</TableCell>
                    <TableCell>{viewsMap[video.id] || 0}</TableCell>
                    <TableCell>
                      {video.vimeo_id ? (
                        <Badge className="bg-primary/10 text-primary">Vimeo</Badge>
                      ) : (
                        <Badge variant="outline">URL</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {safeFormatDate(video.uploaded_at || video.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setPreviewVideo(video)}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Pré-visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingVideo(video);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteVideo(video.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Video Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Vídeo</DialogTitle>
              <DialogDescription>
                Escolha como deseja adicionar o vídeo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setIsVimeoUploadOpen(true);
                  }}
                  className="w-full h-24 flex flex-col gap-2"
                >
                  <Cloud className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <p className="font-semibold">Upload para Vimeo</p>
                    <p className="text-xs text-muted-foreground">Faça upload direto para o Vimeo</p>
                  </div>
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Adicionar URL de Vídeo</h3>
                  <div className="grid gap-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                      placeholder="Ex: Introdução ao Sistema"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newVideo.description}
                      onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                      placeholder="Descreva o conteúdo do vídeo..."
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select
                      value={newVideo.categoryId}
                      onValueChange={(value) => setNewVideo({ ...newVideo, categoryId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="url">URL do Vídeo *</Label>
                    <Input
                      id="url"
                      type="url"
                      value={newVideo.videoUrl}
                      onChange={(e) => setNewVideo({ ...newVideo, videoUrl: e.target.value })}
                      placeholder="https://exemplo.com/video.mp4"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duração (segundos) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newVideo.duration}
                      onChange={(e) => setNewVideo({ ...newVideo, duration: parseInt(e.target.value) || 0 })}
                      placeholder="120"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Thumbnail</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleThumbnailUpload(e)}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Escolher Imagem
                      </Button>
                    </div>
                    {newVideo.thumbnail && (
                      <img
                        src={newVideo.thumbnail}
                        alt="Thumbnail preview"
                        className="mt-2 h-24 w-auto rounded-md object-cover"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddVideo}
                disabled={!newVideo.title || !newVideo.videoUrl || !newVideo.categoryId}
              >
                Adicionar Vídeo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vimeo Upload Dialog */}
        <Dialog open={isVimeoUploadOpen} onOpenChange={setIsVimeoUploadOpen}>
          <DialogContent className="max-w-3xl h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload de Vídeo para o Vimeo</DialogTitle>
              <DialogDescription>
                Faça upload do seu vídeo diretamente para o Vimeo
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <VimeoUpload />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsVimeoUploadOpen(false);
                  handleVimeoUploadComplete();
                }}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Video Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Vídeo</DialogTitle>
              <DialogDescription>
                Atualize as informações do vídeo
              </DialogDescription>
            </DialogHeader>
            {editingVideo && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-title">Título</Label>
                  <Input
                    id="edit-title"
                    value={editingVideo.title}
                    onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    value={editingVideo.description}
                    onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Select
                    value={editingVideo.categoryId}
                    onValueChange={(value) => setEditingVideo({ ...editingVideo, categoryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-url">URL do Vídeo</Label>
                  <Input
                    id="edit-url"
                    type="url"
                    value={editingVideo.videoUrl}
                    onChange={(e) => setEditingVideo({ ...editingVideo, videoUrl: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-duration">Duração (segundos)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={editingVideo.duration}
                    onChange={(e) => setEditingVideo({ ...editingVideo, duration: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Thumbnail</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleThumbnailUpload(e, true)}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => editFileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Alterar Imagem
                    </Button>
                  </div>
                  {editingVideo.thumbnail && (
                    <img
                      src={editingVideo.thumbnail}
                      alt="Thumbnail preview"
                      className="mt-2 h-24 w-auto rounded-md object-cover"
                    />
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateVideo}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Pré-visualização: {previewVideo?.title}</DialogTitle>
              <DialogDescription>
                Incorporação do player do Vimeo
              </DialogDescription>
            </DialogHeader>
            <div className="relative aspect-video bg-black rounded-md overflow-hidden">
              {computeVimeoEmbed(previewVideo) ? (
                <iframe
                  src={computeVimeoEmbed(previewVideo) as string}
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={previewVideo.title}
                />
              ) : (
                <div className="flex items-center justify-center text-muted-foreground h-full">
                  Sem embed do Vimeo
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewVideo(null)}>Fechar</Button>
              <Button onClick={() => navigate(`/video/${previewVideo?.id}`)}>Abrir página do vídeo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}