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
import { getVideos, addVideo, updateVideo, deleteVideo, getCategories, getViewHistory, getProfiles, addCategory } from '@/lib/supabase';
import { getModules, addModule } from '@/lib/storage';
import { uploadSupportFile } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import PdfViewer from '@/components/PdfViewer';
import VimeoUpload from '@/components/admin/VimeoUpload';

// Tipos locais para remover any e contemplar snake/camel case vindos do backend
interface CategoryRow {
  id: string;
  name: string;
}

interface AdminVideoRow {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  videoUrl?: string;
  thumbnail?: string;
  category_id?: string;
  categoryId?: string;
  category_ids?: string[];
  duration: number;
  vimeo_id?: string;
  vimeoId?: string;
  vimeo_embed_url?: string;
  vimeoEmbedUrl?: string;
  uploadedAt?: string | Date;
  created_at?: string | Date;
  uploaded_by?: string;
  uploadedBy?: string;
  module_id?: string;
  moduleId?: string;
}

export default function AdminVideos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<AdminVideoRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [modulesByCategory, setModulesByCategory] = useState<Record<string, Array<{ id: string; title: string; parentId?: string | null }>>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVimeoUploadOpen, setIsVimeoUploadOpen] = useState(false);
  const [isSelectTypeOpen, setIsSelectTypeOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<AdminVideoRow | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [viewsMap, setViewsMap] = useState<Record<string, number>>({});
  const [previewVideo, setPreviewVideo] = useState<AdminVideoRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [editingTitleId, setEditingTitleId] = useState<string>('');
  const [tempTitle, setTempTitle] = useState<string>('');
  const [editingCatsId, setEditingCatsId] = useState<string>('');
  const [tempCats, setTempCats] = useState<string[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [editCategorySearch, setEditCategorySearch] = useState('');
  const [editModuleSearch, setEditModuleSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    videoUrl: '',
    categoryId: '',
    moduleId: '',
    categoryIds: [] as string[],
    duration: 0,
    thumbnail: ''
  });
  const [newCatSearch, setNewCatSearch] = useState('');
  const [newModuleSearch, setNewModuleSearch] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [showNewAdvanced, setShowNewAdvanced] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Após carregar a lista, tentar preencher duração/thumbnail de vídeos do Vimeo ainda sem dados
  useEffect(() => {
    const fillMissingVimeoData = async () => {
      const pending = videos.filter(v => (v.duration || 0) === 0 || !v.thumbnail);
      for (const v of pending) {
        // extrair possível vimeoId
        const fromEmbed = (v?.vimeo_embed_url || v?.vimeoEmbedUrl)?.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
        const fromUrl = (v?.video_url || v?.videoUrl)?.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
        const vimeoId: string | undefined = (v as unknown as { vimeo_id?: string; vimeoId?: string }).vimeo_id || (v as unknown as { vimeo_id?: string; vimeoId?: string }).vimeoId || fromEmbed || fromUrl;
        if (!vimeoId) continue;
        try {
          const resp = await fetch(`/api/vimeo-thumbnail/${encodeURIComponent(String(vimeoId))}`);
          if (!resp.ok) continue;
          const data = await resp.json() as { duration?: number; thumbnail?: string | null; embedUrl?: string | null };
          const next: Partial<AdminVideoRow> & { vimeo_embed_url?: string } = {};
          if ((data?.duration ?? 0) > 0) next.duration = Math.floor(data.duration);
          if (data?.thumbnail && !v.thumbnail) next.thumbnail = String(data.thumbnail);
          if (data?.embedUrl) next.vimeo_embed_url = String(data.embedUrl);
          if (Object.keys(next).length > 0) {
            try { await updateVideo(v.id, next as unknown as AdminVideoRow); } catch {/* ignore */}
          }
        } catch {/* ignore */}
      }
    };
    if (videos.length > 0) fillMissingVimeoData();
  }, [videos]);

  const loadData = async () => {
    setLoading(true);
    const [videosData, categoriesData, viewHistory, profiles] = await Promise.all([
      getVideos(),
      getCategories(),
      getViewHistory(),
      getProfiles(),
    ]);
    setVideos(videosData);
    setCategories(categoriesData);
    // Carregar módulos por categoria
    const modMap: Record<string, Array<{ id: string; title: string; parentId?: string | null }>> = {};
    for (const c of categoriesData) {
      const list = await getModules(c.id);
      modMap[c.id] = list.map(m => ({ id: m.id, title: m.title, parentId: m.parentId ?? null }));
    }
    setModulesByCategory(modMap);
    const pmap: Record<string, string> = {};
    for (const p of profiles as Array<{ id?: string; name?: string; email?: string }> ) {
      if (p && p.id) pmap[p.id] = (p.name || p.email || '');
    }
    setProfileMap(pmap);
    // construir mapa de views por videoId
    const temp: Record<string, number> = {};
    for (const vh of viewHistory) {
      temp[vh.videoId] = (temp[vh.videoId] || 0) + 1;
    }
    setViewsMap(temp);
    setLoading(false);
  };

  const handleAddVideo = async () => {
    if (!newVideo.title || !newVideo.videoUrl || (newVideo.categoryIds || []).length === 0) {
      toast({
        title: "Erro ao adicionar vídeo",
        description: "Preencha título, URL e selecione ao menos uma categoria.",
        variant: "destructive",
      });
      return;
    }

    try {
      const allCats = Array.from(new Set([...(newVideo.categoryIds || [])]));
      const mainId = allCats[0];
      await addVideo({
        title: newVideo.title,
        description: newVideo.description,
        video_url: newVideo.videoUrl,
        thumbnail: newVideo.thumbnail || undefined,
        category_id: mainId,
        category_ids: allCats,
        module_id: newVideo.moduleId || undefined,
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
        categoryIds: [],
        moduleId: '',
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
      const mainCat = editingVideo.category_id || editingVideo.categoryId;
      if (!mainCat) {
        toast({ title: 'Selecione a categoria principal', variant: 'destructive' });
        return;
      }
      await updateVideo(editingVideo.id, {
        title: editingVideo.title,
        description: editingVideo.description,
        video_url: editingVideo.video_url || editingVideo.videoUrl,
        thumbnail: editingVideo.thumbnail,
        category_id: editingVideo.category_id || editingVideo.categoryId,
        category_ids: editingVideo.category_ids,
        module_id: editingVideo.module_id || editingVideo.moduleId,
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
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
    const backup = videos.slice();
    try {
      await deleteVideo(videoId);
      await loadData();
      let undo = true;
      toast({
        title: 'Vídeo excluído',
        description: 'Clique para desfazer',
      });
      setTimeout(async () => {
        if (!undo) return;
      }, 8000);
      // Simplificação: mostrar prompt de desfazer via confirm
      setTimeout(async () => {
        if (window.confirm('Desfazer exclusão do vídeo?')) {
          // Restauração básica em memória (somente visual até recarregar)
          setVideos(backup);
          toast({ title: 'Ação desfeita' });
          undo = false;
        }
      }, 100);
    } catch (error) {
      toast({
        title: 'Erro ao excluir vídeo',
        description: 'Ocorreu um erro ao remover o vídeo.',
        variant: 'destructive',
      });
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

  const safeFormatDate = (value: Date | string | number | null | undefined) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  };

  const computeVimeoEmbed = (video: AdminVideoRow | null): string | null => {
    if (!video) return null;
    if (video.vimeo_embed_url || video.vimeoEmbedUrl) return String(video.vimeo_embed_url || video.vimeoEmbedUrl);
    if (video.vimeo_id) return `https://player.vimeo.com/video/${video.vimeo_id}`;
    const url: string | undefined = video.video_url || video.videoUrl;
    const match = url?.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (match?.[1]) return `https://player.vimeo.com/video/${match[1]}`;
    return null;
  };

  const getUploaderName = (v: AdminVideoRow): string => {
    const raw = (v.uploaded_by || v.uploadedBy || '').trim();
    if (!raw) return 'admin';
    // Se for UUID conhecido, tentar mapear para o nome do perfil
    const uuidLike = /^[0-9a-fA-F-]{30,}$/;
    if (uuidLike.test(raw) && profileMap[raw]) return profileMap[raw];
    return raw;
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  const getVimeoThumbFallback = (v: AdminVideoRow): string | null => {
    // Tentar extrair de vários campos (embed/url/id)
    const fromEmbed = (v?.vimeo_embed_url || v?.vimeoEmbedUrl)?.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    const fromUrl = (v?.video_url || v?.videoUrl)?.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
    const id = v?.vimeoId || v?.vimeo_id || fromEmbed || fromUrl;
    return id ? `https://vumbnail.com/${id}.jpg` : null;
  };

  const isProcessing = (v: AdminVideoRow) => {
    return (v.duration || 0) === 0 || !v.thumbnail;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const applyBulkMove = async () => {
    if (!bulkCategoryId || selectedIds.length === 0) return;
    for (const id of selectedIds) {
      const v = videos.find(x => x.id === id);
      if (!v) continue;
      const current = ((v as unknown as { category_ids?: string[] }).category_ids) || (v.categoryId ? [v.categoryId] : []);
      const next = Array.from(new Set([bulkCategoryId, ...current]));
      await updateVideo(id, { category_id: next[0], category_ids: next });
    }
    setSelectedIds([]);
    setBulkCategoryId('');
    await loadData();
    toast({ title: 'Vídeos atualizados', description: 'Categorias aplicadas' });
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
              onClick={() => setIsSelectTypeOpen(true)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Enviar novo material
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
            {selectedIds.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm">Selecionados: {selectedIds.length}</span>
                <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                  <SelectTrigger className="w-[240px]"><SelectValue placeholder="Mover para categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={applyBulkMove} disabled={!bulkCategoryId}>Aplicar</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>Limpar</Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? videos.map(v => v.id) : [])} checked={selectedIds.length > 0 && selectedIds.length === videos.length} aria-label="Selecionar todos" />
                  </TableHead>
                  <TableHead>Thumb</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                  <TableHead className="hidden md:table-cell">Duração</TableHead>
                  <TableHead className="hidden lg:table-cell">Enviado por</TableHead>
                  <TableHead className="hidden lg:table-cell">Views</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Upload</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos
                  .filter(v => (filterCategory && filterCategory !== 'all' ? (v.categoryId || v.category_id) === filterCategory : true))
                  .filter(v => (search ? (v.title || '').toLowerCase().includes(search.toLowerCase()) : true))
                  .map(video => (
                  <TableRow key={video.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedIds.includes(video.id)} onChange={() => toggleSelect(video.id)} aria-label="Selecionar" />
                    </TableCell>
                    <TableCell>
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.title} className="h-10 w-16 object-cover rounded" loading="lazy" />
                      ) : (
                        getVimeoThumbFallback(video) ? (
                          <img src={getVimeoThumbFallback(video) as string} alt={video.title} className="h-10 w-16 object-cover rounded" loading="lazy" />
                        ) : (
                          <div className="h-10 w-16 bg-muted rounded" />
                        )
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {editingTitleId === video.id ? (
                        <input
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') { await updateVideo(video.id, { title: tempTitle }); setEditingTitleId(''); await loadData(); }
                            if (e.key === 'Escape') { setEditingTitleId(''); }
                          }}
                          autoFocus
                          className="w-full border rounded px-2 py-1"
                        />
                      ) : (
                        <button className="text-left hover:underline" onClick={() => { setEditingTitleId(video.id); setTempTitle(video.title || ''); }}>{video.title}</button>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {editingCatsId === video.id ? (
                          <>
                            {categories.map((c: { id: string; name: string }) => {
                              const checked = tempCats.includes(c.id);
                              return (
                                <label key={c.id} className="text-xs flex items-center gap-1">
                                  <input type="checkbox" checked={checked} onChange={(e) => setTempCats(prev => e.target.checked ? Array.from(new Set([...prev, c.id])) : prev.filter(id => id !== c.id))} />{c.name}
                                </label>
                              );
                            })}
                          </>
                        ) : (
                          ((video as unknown as { category_ids?: string[]; category_id?: string }).category_ids || [video.categoryId || (video as unknown as { category_id?: string }).category_id]).filter(Boolean).slice(0,3).map((cid) => (
                            <Badge key={cid} variant="secondary">
                              {getCategoryName(cid)}
                            </Badge>
                          ))
                        )}
                        {(((video as unknown as { category_ids?: string[] }).category_ids?.length) || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">+{((video as unknown as { category_ids?: string[] }).category_ids!.length) - 3}</Badge>
                        )}
                      </div>
                      {editingCatsId === video.id ? (
                        <div className="mt-1 flex gap-2">
                          <Button size="sm" onClick={async () => { const next = tempCats; await updateVideo(video.id, { category_id: next[0], category_ids: next }); setEditingCatsId(''); await loadData(); }}>Salvar</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingCatsId('')}>Cancelar</Button>
                        </div>
                      ) : (
                        <button className="text-xs underline mt-1" onClick={() => { const current = ((video as unknown as { category_ids?: string[] }).category_ids) || (video.categoryId ? [video.categoryId] : []); setEditingCatsId(video.id); setTempCats(current); }}>editar</button>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatDuration(video.duration)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{getUploaderName(video)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{viewsMap[video.id] || 0}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {isProcessing(video) ? (
                        <Badge variant="outline" className="text-xs">Processando</Badge>
                      ) : video.vimeoId ? (
                        <Badge className="bg-primary/10 text-primary">Vimeo</Badge>
                      ) : (
                        <Badge variant="outline">URL</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {safeFormatDate(video.uploadedAt || video.created_at)}
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
                            onClick={async () => {
                              const alsoVimeo = window.confirm('Apagar também no Vimeo?');
                              const vId: string | undefined = (video as AdminVideoRow).vimeo_id || (video as AdminVideoRow).vimeoId;
                              if (alsoVimeo && vId) {
                                try {
                                  await fetch(`${location.origin}/api/vimeo/${encodeURIComponent(vId)}`, { method: 'DELETE' });
                                } catch (e) {
                                  console.error('Falha ao apagar no Vimeo', e);
                                }
                              }
                              handleDeleteVideo(video.id);
                            }}
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

        {/* Seletor de tipo de material */}
        <Dialog open={isSelectTypeOpen} onOpenChange={setIsSelectTypeOpen}>
          <DialogContent className="sm:max-w-[480px]" aria-describedby="select-type-desc">
            <DialogHeader>
              <DialogTitle>Escolha o tipo de material</DialogTitle>
              <DialogDescription id="select-type-desc">Selecione se deseja enviar um vídeo (Vimeo) ou um arquivo (PDF/JPG/PNG)</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <Button className="h-20 gap-2" variant="outline" onClick={() => { setIsSelectTypeOpen(false); navigate('/admin/vimeo-upload'); }}>
                <Cloud className="h-5 w-5" /> Vídeo (Vimeo)
              </Button>
              <Button className="h-20 gap-2" onClick={() => { setIsSelectTypeOpen(false); navigate('/admin/material-upload'); }}>
                <Upload className="h-5 w-5" /> Arquivo (PDF/JPG/PNG)
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                    <Label htmlFor="category">Categorias (múltiplas) *</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full min-h-10 border rounded px-2 py-2 text-left flex items-center flex-wrap gap-1">
                          {(() => {
                            const selected = categories.filter(c => (newVideo.categoryIds || []).includes(c.id));
                            return selected.length > 0 ? (
                              selected.map(s => (
                                <span key={s.id} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded">
                                  {s.name}
                                  <button type="button" className="opacity-70 hover:opacity-100" onClick={(e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    setNewVideo(v => ({ ...v, categoryIds: (v.categoryIds || []).filter(id => id !== s.id) }));
                                  }}>×</button>
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">Selecionar categorias...</span>
                            );
                          })()}
                          <span className="ml-auto text-muted-foreground text-sm">▼</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-80">
                        <div className="px-2 py-2">
                          <Input placeholder="Buscar categoria..." value={newCatSearch} onChange={(e) => setNewCatSearch(e.target.value)} />
                        </div>
                        <div className="max-h-72 overflow-auto">
                          {categories
                            .filter(c => (newCatSearch ? (c.name || '').toLowerCase().includes(newCatSearch.toLowerCase()) : true))
                            .map(category => {
                              const checked = (newVideo.categoryIds || []).includes(category.id);
                              return (
                                <DropdownMenuItem
                                  key={category.id}
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setNewVideo(v => ({ ...v,
                                      categoryIds: checked ? (v.categoryIds || []).filter(id => id !== category.id) : Array.from(new Set([...(v.categoryIds || []), category.id]))
                                    }));
                                  }}
                                >
                                  <input type="checkbox" readOnly checked={checked} className="mr-2" />
                                  {category.name}
                                </DropdownMenuItem>
                              );
                            })}
                          {/* Criar categoria inline */}
                          {newCatSearch && !categories.some(c => (c.name || '').toLowerCase() === newCatSearch.toLowerCase()) && (
                            <DropdownMenuItem
                              onSelect={async (e) => {
                                e.preventDefault();
                                try {
                                  setCreatingNew(true);
                                  const row = await addCategory({ name: newCatSearch, description: '' });
                                  const cats = await getCategories();
                                  setCategories(cats);
                                  const newId = (row as unknown as { id?: string })?.id || cats.find(c => c.name === newCatSearch)?.id;
                                  if (newId) setNewVideo(v => ({ ...v, categoryIds: Array.from(new Set([...(v.categoryIds || []), newId])) }));
                                  setNewCatSearch('');
                                  toast({ title: 'Categoria criada' });
                                } catch { toast({ title: 'Erro ao criar categoria', variant: 'destructive' }); }
                                finally { setCreatingNew(false); }
                              }}
                            >
                              {creatingNew ? 'Criando...' : `+ Criar categoria "${newCatSearch}"`}
                            </DropdownMenuItem>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate('/admin/taxonomia')}>Gerenciar categorias/módulos</Button>
                    {newVideo.categoryId && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/taxonomia?categoryId=${newVideo.categoryId}`)}>Abrir categoria atual</Button>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Avançado</Label>
                      <Button size="sm" variant="outline" onClick={() => setShowNewAdvanced(!showNewAdvanced)}>
                        {showNewAdvanced ? 'Ocultar' : 'Mostrar'}
                      </Button>
                    </div>
                    {showNewAdvanced && (
                      <div className="space-y-2">
                        <div>
                          <Label>Categorias (múltiplas)</Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="w-full min-h-10 border rounded px-2 py-2 text-left flex items-center flex-wrap gap-1">
                                {(() => {
                                  const selectedIds: string[] = Array.from(new Set([newVideo.categoryId, ...newVideo.categoryIds].filter(Boolean)));
                                  const selected = categories.filter(c => selectedIds.includes(c.id));
                                  return selected.length > 0 ? (
                                    selected.map(s => (
                                      <span key={s.id} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded">
                                        {s.name}
                                        {(s.id !== newVideo.categoryId) && (
                                          <button
                                            type="button"
                                            className="opacity-70 hover:opacity-100"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const current = selectedIds;
                                              const next = current.filter(id => id !== s.id);
                                              const ensured = newVideo.categoryId && !next.includes(newVideo.categoryId) ? [newVideo.categoryId, ...next] : next;
                                              setNewVideo({ ...newVideo, categoryIds: ensured.filter(id => id !== newVideo.categoryId) });
                                            }}
                                          >×</button>
                                        )}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground text-sm">Selecionar categorias...</span>
                                  );
                                })()}
                                <span className="ml-auto text-muted-foreground text-sm">▼</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-80">
                              <div className="px-2 py-2">
                                <Input
                                  placeholder="Buscar categoria..."
                                  value={newCatSearch}
                                  onChange={(e) => setNewCatSearch(e.target.value)}
                                />
                              </div>
                              <div className="max-h-72 overflow-auto">
                                {categories
                                  .filter((c) => (newCatSearch ? (c.name || '').toLowerCase().includes(newCatSearch.toLowerCase()) : true))
                                  .map((category) => {
                                    const list: string[] = Array.from(new Set([newVideo.categoryId, ...newVideo.categoryIds].filter(Boolean)));
                                    const checked = list.includes(category.id);
                                    const disabled = category.id === newVideo.categoryId; // principal sempre incluída
                                    return (
                                      <DropdownMenuItem
                                        key={category.id}
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          const current = list;
                                          let next: string[];
                                          if (checked) {
                                            if (disabled) return; // não remove a principal
                                            next = current.filter((id) => id !== category.id);
                                          } else {
                                            next = Array.from(new Set([...current, category.id]));
                                          }
                                          const ensured = newVideo.categoryId && !next.includes(newVideo.categoryId) ? [newVideo.categoryId, ...next] : next;
                                          setNewVideo({ ...newVideo, categoryIds: ensured.filter(id => id !== newVideo.categoryId) });
                                        }}
                                      >
                                        <input type="checkbox" readOnly checked={checked} className="mr-2" />
                                        {category.name}
                                        {disabled && <span className="ml-auto text-xs text-muted-foreground">principal</span>}
                                      </DropdownMenuItem>
                                    );
                                  })}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <p className="text-xs text-muted-foreground mt-1">A categoria principal sempre ficará selecionada.</p>
                        </div>
                      </div>
                    )}
                  </div>
                {(newVideo.categoryIds || []).length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="module">Módulo/Submódulo</Label>
                    <Input
                      placeholder="Buscar módulo..."
                      value={newModuleSearch}
                      onChange={(e) => setNewModuleSearch(e.target.value)}
                    />
                    <Select
                      value={newVideo.moduleId}
                      onValueChange={(value) => setNewVideo({ ...newVideo, moduleId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um módulo (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          // União de módulos das categorias selecionadas
                          const sets: Array<{ id: string; title: string; parentId?: string | null }> = [];
                          for (const cid of (newVideo.categoryIds || [])) {
                            for (const m of (modulesByCategory[cid] || [])) {
                              sets.push(m);
                            }
                          }
                          const all = sets.filter((m) => (newModuleSearch ? (m.title || '').toLowerCase().includes(newModuleSearch.toLowerCase()) : true));
                          const roots = all.filter(m => !m.parentId);
                          return (
                            <div className="max-h-64 overflow-auto">
                              {roots.map(root => {
                                const children = all.filter(m => m.parentId === root.id);
                                return (
                                  <div key={root.id}>
                                    <div className="px-2 py-1 text-xs text-muted-foreground uppercase">{root.title}</div>
                                    <SelectItem value={root.id}>{root.title}</SelectItem>
                                    {children.map(child => (
                                      <SelectItem key={child.id} value={child.id}><span className="pl-4 inline-block">↳ {child.title}</span></SelectItem>
                                    ))}
                                  </div>
                                );
                              })}
                              {/* Criar módulo inline */}
                              {newModuleSearch && !all.some(m => (m.title || '').toLowerCase() === newModuleSearch.toLowerCase()) && (
                                <div className="px-2 py-1">
                                  <Button size="sm" onClick={async () => {
                                    try {
                                      setCreatingNew(true);
                                      for (const cid of (newVideo.categoryIds || [])) {
                                        await addModule({ categoryId: cid, parentId: null, title: newModuleSearch, order: 999 });
                                      }
                                      // recarrega módulos
                                      const modMap: Record<string, Array<{ id: string; title: string; parentId?: string | null }>> = {};
                                      for (const c of categories) {
                                        const list = await getModules(c.id);
                                        modMap[c.id] = list.map(m => ({ id: m.id, title: m.title, parentId: m.parentId ?? null }));
                                      }
                                      setModulesByCategory(modMap);
                                      setNewModuleSearch('');
                                      toast({ title: 'Módulo criado' });
                                    } catch { toast({ title: 'Erro ao criar módulo', variant: 'destructive' }); }
                                    finally { setCreatingNew(false); }
                                  }}>{creatingNew ? 'Criando...' : `+ Criar módulo "${newModuleSearch}"`}</Button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Enviar arquivo (PDF/JPG/PNG)</h3>
                    <Input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          const res = await uploadSupportFile(f);
                          setNewVideo({ ...newVideo, videoUrl: res.url, thumbnail: f.type.startsWith('image/') ? res.url : newVideo.thumbnail, duration: 0 });
                        } catch (err) {
                          toast({ title: 'Falha ao enviar arquivo', variant: 'destructive' });
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">O arquivo será disponibilizado como material na lista. Para imagens, usaremos a própria imagem como thumbnail.</p>
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
                  <Label>Categoria Principal</Label>
                  <Select
                    value={(editingVideo.category_id || editingVideo.categoryId || '') as string}
                    onValueChange={(value) => setEditingVideo({ ...editingVideo, category_id: value, categoryId: value, module_id: '', moduleId: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria principal" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1">
                        <Input
                          placeholder="Buscar categoria..."
                          value={editCategorySearch}
                          onChange={(e) => setEditCategorySearch(e.target.value)}
                        />
                      </div>
                      {categories
                        .filter((c) => (editCategorySearch ? (c.name || '').toLowerCase().includes(editCategorySearch.toLowerCase()) : true))
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {!((editingVideo.category_id || editingVideo.categoryId)) && (
                    <p className="text-xs text-destructive">Categoria principal é obrigatória</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Avançado</Label>
                    <Button size="sm" variant="outline" onClick={() => setShowAdvanced(!showAdvanced)}>
                      {showAdvanced ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>
                  {showAdvanced && (
                    <div className="space-y-2">
                      <div>
                        <Label>Categorias (múltiplas)</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-full min-h-10 border rounded px-2 py-2 text-left flex items-center flex-wrap gap-1">
                              {(() => {
                                const selectedIds: string[] = (editingVideo.category_ids || (editingVideo.categoryId ? [editingVideo.categoryId] : [])) as unknown as string[];
                                const selected = categories.filter(c => selectedIds.includes(c.id));
                                return selected.length > 0 ? (
                                  selected.map(s => (
                                    <span key={s.id} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded">
                                      {s.name}
                                      {(s.id !== (editingVideo.category_id || editingVideo.categoryId)) && (
                                        <button
                                          type="button"
                                          className="opacity-70 hover:opacity-100"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const main = (editingVideo.category_id || editingVideo.categoryId) as string | undefined;
                                            const current = selectedIds;
                                            const next = current.filter(id => id !== s.id);
                                            // garantir principal presente
                                            const ensured = main && !next.includes(main) ? [main, ...next] : next;
                                            setEditingVideo({ ...editingVideo, category_ids: ensured, categoryId: main || ensured[0] || '' });
                                          }}
                                        >×</button>
                                      )}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground text-sm">Selecionar categorias...</span>
                                );
                              })()}
                              <span className="ml-auto text-muted-foreground text-sm">▼</span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-80">
                            <div className="px-2 py-2">
                              <Input
                                placeholder="Buscar categoria..."
                                value={editCategorySearch}
                                onChange={(e) => setEditCategorySearch(e.target.value)}
                              />
                            </div>
                            <div className="max-h-72 overflow-auto">
                              {categories
                                .filter((c) => (editCategorySearch ? (c.name || '').toLowerCase().includes(editCategorySearch.toLowerCase()) : true))
                                .map((category) => {
                                  const list: string[] = (editingVideo.category_ids || (editingVideo.categoryId ? [editingVideo.categoryId] : [])) as unknown as string[];
                                  const checked = list.includes(category.id);
                                  const main = (editingVideo.category_id || editingVideo.categoryId) as string | undefined;
                                  const disabled = category.id === main; // principal sempre incluída
                                  return (
                                    <DropdownMenuItem
                                      key={category.id}
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        const current = list;
                                        let next: string[];
                                        if (checked) {
                                          if (disabled) return; // não remove a principal
                                          next = current.filter((id) => id !== category.id);
                                        } else {
                                          next = Array.from(new Set([...current, category.id]));
                                        }
                                        // garantir principal presente
                                        const ensured = main && !next.includes(main) ? [main, ...next] : next;
                                        setEditingVideo({ ...editingVideo, category_ids: ensured, categoryId: main || ensured[0] || '' });
                                      }}
                                    >
                                      <input type="checkbox" readOnly checked={checked} className="mr-2" />
                                      {category.name}
                                      {disabled && <span className="ml-auto text-xs text-muted-foreground">principal</span>}
                                    </DropdownMenuItem>
                                  );
                                })}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <p className="text-xs text-muted-foreground mt-1">A categoria principal sempre ficará selecionada.</p>
                      </div>
                    </div>
                  )}
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
                    <Label>Módulo/Submódulo</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Buscar módulo..."
                      value={editModuleSearch}
                      onChange={(e) => setEditModuleSearch(e.target.value)}
                    />
                  </div>
                    <Select
                      value={editingVideo.module_id || editingVideo.moduleId || ''}
                      onValueChange={(value) => setEditingVideo({ ...editingVideo, module_id: value, moduleId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um módulo (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                      {(() => {
                        const all = (modulesByCategory[(editingVideo.category_id || editingVideo.categoryId || '')] || [])
                          .filter((m) => (editModuleSearch ? (m.title || '').toLowerCase().includes(editModuleSearch.toLowerCase()) : true));
                        const roots = all.filter((m) => !m.parentId).sort((a, b) => (Number((a as unknown as { order?: number }).order || 0) - Number((b as unknown as { order?: number }).order || 0)) || String(a.title).localeCompare(String(b.title)));
                        return (
                          <div className="max-h-64 overflow-auto">
                            {roots.map((root) => {
                              const children = all.filter((m) => m.parentId === root.id).sort((a, b) => (Number((a as unknown as { order?: number }).order || 0) - Number((b as unknown as { order?: number }).order || 0)) || String(a.title).localeCompare(String(b.title)));
                              return (
                                <div key={root.id}>
                                  <div className="px-2 py-1 text-xs text-muted-foreground uppercase">{root.title}</div>
                                  <SelectItem value={root.id}>{root.title}</SelectItem>
                                  {children.map((child) => (
                                    <SelectItem key={child.id} value={child.id}>
                                      <span className="pl-4 inline-block">↳ {child.title}</span>
                                    </SelectItem>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      </SelectContent>
                    </Select>
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
            {(() => {
              const pv = (previewVideo as unknown as { video_url?: string; videoUrl?: string } | null);
              const url = String(pv?.video_url || pv?.videoUrl || '');
              const lower = url.toLowerCase();
              const isPdf = lower.endsWith('.pdf') || lower.includes('/api/files/');
              const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(lower);
              const vimeo = computeVimeoEmbed(previewVideo);
              return (
                <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                  {isPdf ? (
                    <PdfViewer url={url} title={previewVideo?.title} className="absolute inset-0 w-full h-full" />
                  ) : isImg ? (
                    <img src={url} alt={previewVideo?.title || 'Imagem'} className="absolute inset-0 w-full h-full object-contain bg-black" />
                  ) : vimeo ? (
                    <iframe
                      src={vimeo as string}
                      className="absolute inset-0 w-full h-full"
                      frameBorder={0}
                      allow="autoplay; fullscreen; picture-in-picture"
                      title={previewVideo?.title || 'Vimeo player'}
                    />
                  ) : (
                    <div className="flex items-center justify-center text-muted-foreground h-full">
                      Sem pré-visualização disponível
                    </div>
                  )}
                </div>
              );
            })()}
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