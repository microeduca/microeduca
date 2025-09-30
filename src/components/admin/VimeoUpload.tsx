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
import { getCategories } from '@/lib/storage';
import type { Category } from '@/types';
import { 
  storeVimeoToken, 
  getVimeoToken, 
  clearVimeoTokens, 
  generateState,
  uploadToVimeo,
  getBackendUrl,
  tokenNeedsRefresh,
  getVimeoRefreshToken
} from '@/lib/vimeo';
import { getCurrentUser } from '@/lib/auth';
import { api } from '@/lib/api';

export default function VimeoUpload() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [uploadedEmbedUrl, setUploadedEmbedUrl] = useState<string | null>(null);

  // Check for existing authentication
  useEffect(() => {
    const token = getVimeoToken();
    if (token) {
      // Check if token needs refresh
      if (tokenNeedsRefresh()) {
        refreshToken();
      } else {
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Carregar categorias
  useEffect(() => {
    (async () => {
      const cats = await getCategories();
      setCategories(cats);
    })();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (code && state) {
      exchangeCodeForToken(code, state);
    }
  }, [location]);

  const refreshToken = async () => {
    const refreshToken = getVimeoRefreshToken();
    if (!refreshToken) {
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(`${getBackendUrl()}/vimeo-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'refreshToken',
          refreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData = await response.json();
      storeVimeoToken(tokenData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Token refresh error:', error);
      clearVimeoTokens();
      setIsAuthenticated(false);
      toast({
        title: 'Erro na autenticação',
        description: 'Por favor, faça login novamente no Vimeo.',
        variant: 'destructive'
      });
    }
  };

  const initiateOAuth = async () => {
    setIsAuthenticating(true);
    const state = generateState();
    localStorage.setItem('vimeo_oauth_state', state);
    
    try {
      const response = await fetch(`${getBackendUrl()}/vimeo-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getAuthUrl',
          state
        })
      });

      if (!response.ok) {
        // Tentar obter mensagem detalhada do servidor
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          throw new Error(data.error || 'Failed to get auth URL');
        } catch {
          throw new Error(text || 'Failed to get auth URL');
        }
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error('OAuth initiation error:', error);
      setIsAuthenticating(false);
      toast({
        title: 'Erro',
        description: (error as Error)?.message || 'Falha ao iniciar autenticação com Vimeo.',
        variant: 'destructive'
      });
    }
  };

  const exchangeCodeForToken = async (code: string, state: string) => {
    const savedState = localStorage.getItem('vimeo_oauth_state');
    
    if (state !== savedState) {
      toast({
        title: 'Erro de segurança',
        description: 'Estado OAuth inválido.',
        variant: 'destructive'
      });
      return;
    }
    
    localStorage.removeItem('vimeo_oauth_state');
    setIsAuthenticating(true);

    try {
      const response = await fetch(`${getBackendUrl()}/vimeo-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'exchangeToken',
          code,
          state
        })
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const tokenData = await response.json();
      storeVimeoToken(tokenData);
      setIsAuthenticated(true);
      
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
    } finally {
      setIsAuthenticating(false);
    }
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
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    const token = getVimeoToken();
    if (!token) {
      toast({
        title: 'Não autenticado',
        description: 'Por favor, faça login no Vimeo primeiro.',
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
          accessToken: token,
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

      // Step 3: Fetch best thumbnail from Vimeo
      let thumbnailUrl = '';
      try {
        const thumbResp = await fetch(`${getBackendUrl()}/vimeo-thumbnail/${videoId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (thumbResp.ok) {
          const { thumbnail } = await thumbResp.json();
          if (thumbnail) thumbnailUrl = thumbnail;
        }
      } catch {}

      // Step 4: Save video in Railway
      const currentUser = getCurrentUser();
      await api.addVideo({
        title,
        description,
        video_url: `https://vimeo.com/${videoId}`,
        thumbnail: thumbnailUrl,
        category_id: categoryId,
        duration: 0,
        uploaded_by: currentUser?.id || 'admin',
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

  const handleLogout = () => {
    clearVimeoTokens();
    setIsAuthenticated(false);
    setUploadedVideoId(null);
    setUploadedEmbedUrl(null);
    toast({
      title: 'Desconectado',
      description: 'Você foi desconectado do Vimeo.',
    });
  };

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
          {/* Authentication Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Conectado ao Vimeo</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">Não conectado ao Vimeo</span>
                </>
              )}
            </div>
            
            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Desconectar
              </Button>
            ) : (
              <Button 
                onClick={initiateOAuth} 
                disabled={isAuthenticating}
                size="sm"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Conectar ao Vimeo
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Upload Form */}
          {isAuthenticated && !uploadedVideoId && (
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
                <Label htmlFor="category">Categoria *</Label>
                <Select 
                  value={categoryId} 
                  onValueChange={setCategoryId}
                  disabled={isUploading}
                >
                  <SelectTrigger id="category" className="mt-1">
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