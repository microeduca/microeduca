import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Video, Category } from '@/types';
import { getVideos, getCategories, addVideo, updateVideo, deleteVideo } from '@/lib/supabase';
import { Plus, Edit, Trash2, Play, Upload, Clock } from 'lucide-react';

export default function AdminVideoManagement() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [newVideo, setNewVideo] = useState<Partial<Video>>({
    title: '',
    description: '',
    videoUrl: '',
    categoryId: '',
    thumbnail: '',
    duration: 0,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [v, c] = await Promise.all([getVideos(), getCategories()]);
      setVideos(v);
      setCategories(c);
    })();
  }, []);

  const handleAddVideo = async () => {
    if (!newVideo.title || !newVideo.categoryId || !newVideo.videoUrl) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    const video: Video = {
      id: `vid-${Date.now()}`,
      title: newVideo.title,
      description: newVideo.description || '',
      videoUrl: newVideo.videoUrl,
      thumbnail: newVideo.thumbnail || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800',
      categoryId: newVideo.categoryId,
      duration: newVideo.duration || 0,
      uploadedBy: 'Administrador',
      uploadedAt: new Date(),
    };

    await addVideo(video);
    setVideos(await getVideos());
    setNewVideo({
      title: '',
      description: '',
      videoUrl: '',
      categoryId: '',
      thumbnail: '',
      duration: 0,
    });
    setIsAddDialogOpen(false);
    
    toast({
      title: 'Sucesso',
      description: 'Vídeo adicionado com sucesso!',
    });
  };

  const handleUpdateVideo = async () => {
    if (!editingVideo) return;

    await updateVideo(editingVideo);
    setVideos(await getVideos());
    setIsEditDialogOpen(false);
    setEditingVideo(null);
    
    toast({
      title: 'Sucesso',
      description: 'Vídeo atualizado com sucesso!',
    });
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este vídeo?')) {
      await deleteVideo(videoId);
      setVideos(await getVideos());
      
      toast({
        title: 'Sucesso',
        description: 'Vídeo excluído com sucesso!',
      });
    }
  };

  const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isEdit && editingVideo) {
          setEditingVideo({ ...editingVideo, thumbnail: base64String });
        } else {
          setNewVideo({ ...newVideo, thumbnail: base64String });
        }
        toast({
          title: 'Sucesso',
          description: 'Thumbnail carregada com sucesso!',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gerenciamento de Vídeos</CardTitle>
              <CardDescription>
                Adicione, edite e gerencie os vídeos de treinamento
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:shadow-glow">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Vídeo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Vídeo</DialogTitle>
                  <DialogDescription>
                    Preencha as informações do vídeo de treinamento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                      placeholder="Ex: Protocolo de Atendimento"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newVideo.description}
                      onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                      placeholder="Descreva o conteúdo do vídeo..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={newVideo.categoryId} onValueChange={(value) => setNewVideo({ ...newVideo, categoryId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="videoUrl">URL do Vídeo *</Label>
                    <Input
                      id="videoUrl"
                      value={newVideo.videoUrl}
                      onChange={(e) => setNewVideo({ ...newVideo, videoUrl: e.target.value })}
                      placeholder="https://youtube.com/embed/..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duração (segundos)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newVideo.duration}
                      onChange={(e) => setNewVideo({ ...newVideo, duration: parseInt(e.target.value) || 0 })}
                      placeholder="Ex: 1800"
                    />
                  </div>
                  <div>
                    <Label>Thumbnail</Label>
                    <div className="flex items-center gap-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleThumbnailUpload(e, false)}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Carregar Imagem
                      </Button>
                      {newVideo.thumbnail && (
                        <img
                          src={newVideo.thumbnail}
                          alt="Thumbnail preview"
                          className="h-20 w-32 object-cover rounded"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddVideo} className="bg-gradient-primary">
                      Adicionar Vídeo
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thumbnail</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="h-12 w-20 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{video.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getCategoryName(video.categoryId)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.duration)}
                    </div>
                  </TableCell>
                  <TableCell>{video.uploadedBy}</TableCell>
                  <TableCell>{new Date(video.uploadedAt).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(video.videoUrl, '_blank')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingVideo(video);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Editar Vídeo</DialogTitle>
                            <DialogDescription>
                              Atualize as informações do vídeo
                            </DialogDescription>
                          </DialogHeader>
                          {editingVideo && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-title">Título</Label>
                                <Input
                                  id="edit-title"
                                  value={editingVideo.title}
                                  onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-description">Descrição</Label>
                                <Textarea
                                  id="edit-description"
                                  value={editingVideo.description}
                                  onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                                  rows={3}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-category">Categoria</Label>
                                <Select
                                  value={editingVideo.categoryId}
                                  onValueChange={(value) => setEditingVideo({ ...editingVideo, categoryId: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map((category) => (
                                      <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Thumbnail</Label>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleThumbnailUpload(e, true)}
                                    className="hidden"
                                    id="edit-thumbnail"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('edit-thumbnail')?.click()}
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Alterar Imagem
                                  </Button>
                                  {editingVideo.thumbnail && (
                                    <img
                                      src={editingVideo.thumbnail}
                                      alt="Thumbnail preview"
                                      className="h-20 w-32 object-cover rounded"
                                    />
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleUpdateVideo} className="bg-gradient-primary">
                                  Salvar Alterações
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteVideo(video.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}