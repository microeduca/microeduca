import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, Video, AlertCircle, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { getCategories, getModules } from '@/lib/storage';
import type { Category, Module } from '@/types';
import { uploadToVimeo, getBackendUrl } from '@/lib/vimeo';
import { getCurrentUser } from '@/lib/auth';
import { api } from '@/lib/api';

export default function VimeoUpload() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [hasServerToken, setHasServerToken] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [moduleId, setModuleId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [modules, setModules] = useState<Array<Pick<Module, 'id' | 'title' | 'parentId' | 'order'>>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [uploadedEmbedUrl, setUploadedEmbedUrl] = useState<string | null>(null);

  // Verificar se o backend possui token permanente configurado
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await fetch(`${getBackendUrl()}/vimeo-token/status`);
        const data = await res.json();
        if (!canceled) setHasServerToken(!!data?.hasToken);
      } catch {
        if (!canceled) setHasServerToken(false);
      }
    })();
    return () => { canceled = true; };
  }, []);

  // Carregar categorias
  useEffect(() => {
    (async () => {
      const cats = await getCategories();
      setCategories(cats);
    })();
  }, []);

  // Carregar módulos quando a categoria mudar
  useEffect(() => {
    (async () => {
      if (!categoryId) {
        setModules([]);
        setModuleId('');
        return;
      }
      const mods = await getModules(categoryId);
      setModules(mods.map(m => ({ id: m.id, title: m.title, parentId: m.parentId ?? null, order: m.order })));
      setModuleId('');
    })();
  }, [categoryId]);

  // Handle OAuth callback (mantido apenas para compatibilidade; ignora com token permanente)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state) {
      // não faz nada, usamos token do servidor
      navigate('/admin/vimeo-upload', { replace: true });
    }
  }, [location, navigate]);

  // Mantido apenas para compatibilidade de rota; não usado com token permanente
  const exchangeCodeForToken = async (_code: string, _state: string) => {
    const savedState = localStorage.getItem('vimeo_oauth_state');
    
    if (_state !== savedState) {
      toast({
        title: 'Erro de segurança',
        description: 'Estado OAuth inválido.',
        variant: 'destructive'
      });
      return;
    }
    
    localStorage.removeItem('vimeo_oauth_state');
    // fluxo OAuth desativado (usamos token do servidor)

    try {
      const response = await fetch(`${getBackendUrl()}/vimeo-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'exchangeToken',
          code: _code,
          state: _state
        })
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      await response.json();
      
      // Clear URL params
      navigate('/admin/vimeo-upload', { replace: true });
      
      toast({
        title: 'Sucesso!',
        description: 'Autenticação com Vimeo realizada com sucesso.',
      });
    } catch (error) {
      console.error('Token exchange error:', error);
      toast({
        title: 'Erro',
        description: 'Falha na autenticação com Vimeo.',
        variant: 'destructive'
      });
    } finally { /* noop */ }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('video/')) {
        setFile(selectedFile);
      } else {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo de vídeo.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !categoryId) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, selecione a categoria e informe o título/arquivo.',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Create video on Vimeo and get upload URL
      const response = await fetch(`${getBackendUrl()}/vimeo-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-file-size': file.size.toString()
        },
        body: JSON.stringify({
          // sem accessToken: backend usa token permanente do servidor
          title,
          description,
          privacy: {
            view: 'unlisted',
            embed: 'public',
            download: false,
            add: false,
            comments: 'nobody'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create video on Vimeo');
      }

      const { uploadLink, videoId, embedUrl } = await response.json();
      
      // Step 2: Upload the actual video file
      await uploadToVimeo(file, uploadLink, (percentage) => {
        setUploadProgress(percentage);
      });

      // Step 3: Fetch best thumbnail and duration from Vimeo
      let thumbnailUrl = '';
      let durationSec = 0;
      try {
        const thumbResp = await fetch(`${getBackendUrl()}/vimeo-thumbnail/${videoId}`);
        if (thumbResp.ok) {
          const { thumbnail, duration } = await thumbResp.json();
          if (thumbnail) thumbnailUrl = thumbnail;
          if (typeof duration === 'number') durationSec = duration;
        }
      } catch (e) {
        console.warn('Falha ao obter thumbnail/duração do Vimeo');
      }

      // Step 4: Save video in Railway
      const currentUser = getCurrentUser();
      await api.addVideo({
        title,
        description,
        video_url: `https://vimeo.com/${videoId}`,
        thumbnail: thumbnailUrl,
        category_id: categoryId,
        category_ids: [categoryId],
        module_id: moduleId || undefined,
        duration: durationSec || 0,
        uploaded_by: currentUser?.name || 'admin',
        vimeo_id: videoId,
        vimeo_embed_url: embedUrl,
      });
      
      setUploadedVideoId(videoId);
      setUploadedEmbedUrl(embedUrl);
      
      toast({
        title: 'Upload concluído!',
        description: 'Vídeo enviado com sucesso para o Vimeo.',
      });

      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      setCategoryId('');
      setModuleId('');
      setModules([]);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: 'Falha ao enviar vídeo para o Vimeo.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => { /* usando token do servidor, sem logout */ };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload de Vídeo para Vimeo</CardTitle>
          <CardDescription>
            Faça upload seguro de vídeos diretamente para o Vimeo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Server Token Status */}
          {hasServerToken === false && (
            <div className="p-4 border rounded-lg text-sm text-yellow-800 bg-yellow-50">
              Token do Vimeo não configurado no servidor. Adicione a variável VIMEO_ACCESS_TOKEN no Railway.
            </div>
          )}

          {/* Upload Form */}
          {hasServerToken && !uploadedVideoId && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="video-file">Arquivo de Vídeo *</Label>
                <Input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="mt-1"
                />
                {file && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Selecionado: {file.name} ({Math.round(file.size / 1024 / 1024)}MB)
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Digite o título do vídeo"
                  disabled={isUploading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Digite a descrição do vídeo"
                  disabled={isUploading}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label>Categoria *</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Módulo/Submódulo (opcional)</Label>
                <Select value={moduleId} onValueChange={setModuleId} disabled={!categoryId || modules.length === 0}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={categoryId ? (modules.length ? 'Selecione o módulo' : 'Nenhum módulo nesta categoria') : 'Escolha uma categoria primeiro'} />
                  </SelectTrigger>
                  <SelectContent>
                    {modules
                      .filter((m) => !m.parentId)
                      .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || String(a.title).localeCompare(String(b.title)))
                      .map((root) => (
                        <div key={root.id}>
                          <SelectItem value={root.id}>{root.title}</SelectItem>
                          {modules
                            .filter((m) => m.parentId === root.id)
                            .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || String(a.title).localeCompare(String(b.title)))
                            .map((child) => (
                              <SelectItem key={child.id} value={child.id}>↳ {child.title}</SelectItem>
                            ))}
                        </div>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Enviando vídeo...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Upload Button */}
              <Button 
                onClick={handleUpload}
                disabled={isUploading || !file || !title || !categoryId}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando... ({uploadProgress}%)
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar para Vimeo
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Success Preview */}
          {uploadedVideoId && uploadedEmbedUrl && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Vídeo enviado com sucesso! ID do Vimeo: {uploadedVideoId}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Pré-visualização do Vídeo</Label>
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={uploadedEmbedUrl}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="Vimeo video preview"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setUploadedVideoId(null);
                    setUploadedEmbedUrl(null);
                  }}
                  className="flex-1"
                >
                  Enviar Outro Vídeo
                </Button>
                <Button 
                  onClick={() => navigate('/admin')}
                  className="flex-1"
                >
                  Voltar ao Painel
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>• O vídeo foi configurado como não listado (unlisted)</p>
                <p>• Incorporação permitida apenas no domínio do sistema</p>
                <p>• Downloads desabilitados para proteção do conteúdo</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}