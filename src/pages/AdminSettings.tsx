import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getWelcomeVideo, setWelcomeVideo, uploadSupportFile } from '@/lib/storage';

type WelcomeConfig = { title?: string; url?: string };

export default function AdminSettings() {
  const { toast } = useToast();
  const [userCfg, setUserCfg] = useState<WelcomeConfig>({ title: '', url: '' });
  const [clienteCfg, setClienteCfg] = useState<WelcomeConfig>({ title: '', url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<Array<{ id: string; url: string; filename: string; mimeType: string }>>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [u, c] = await Promise.all([
          getWelcomeVideo('user'),
          getWelcomeVideo('cliente'),
        ]);
        setUserCfg({ title: u?.title || '', url: u?.url || '' });
        setClienteCfg({ title: c?.title || '', url: c?.url || '' });
        // opcional: podemos carregar uma lista salva de arquivos via settings
        const stored = await (await import('@/lib/api')).api.getSetting('support_files').catch(() => [] as any);
        if (Array.isArray(stored)) setFiles(stored as any);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        setWelcomeVideo('user', userCfg),
        setWelcomeVideo('cliente', clienteCfg),
      ]);
      await (await import('@/lib/api')).api.setSetting('support_files', files);
      toast({ title: 'Configurações salvas' });
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadSupportFile(file);
      setFiles((prev) => [...prev, { id: res.id, url: res.url, filename: res.filename, mimeType: res.mimeType }]);
      toast({ title: 'Arquivo enviado' });
    } catch (err: any) {
      toast({ title: 'Falha no upload', description: err?.message || '', variant: 'destructive' });
    } finally {
      e.currentTarget.value = '';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-poppins font-bold">Configurações</h1>
          <p className="text-muted-foreground">Vídeos de boas‑vindas e preferências gerais</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Boas‑vindas — Usuários</CardTitle>
              <CardDescription>URL do player (ex.: https://player.vimeo.com/video/ID?h=...)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="user-title">Título</Label>
                <Input id="user-title" value={userCfg.title} onChange={(e) => setUserCfg({ ...userCfg, title: e.target.value })} placeholder="Bem‑vindo(a)!" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-url">URL</Label>
                <Input id="user-url" value={userCfg.url} onChange={(e) => setUserCfg({ ...userCfg, url: e.target.value })} placeholder="https://player.vimeo.com/video/123456789?h=xxxx" />
              </div>
              {userCfg.url && (
                <div className="rounded overflow-hidden bg-muted">
                  <div className="aspect-video">
                    <iframe src={userCfg.url} className="w-full h-full" frameBorder={0} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={userCfg.title || 'Boas‑vindas usuário'} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Boas‑vindas — Clientes</CardTitle>
              <CardDescription>URL do player (ex.: https://player.vimeo.com/video/ID?h=...)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="cliente-title">Título</Label>
                <Input id="cliente-title" value={clienteCfg.title} onChange={(e) => setClienteCfg({ ...clienteCfg, title: e.target.value })} placeholder="Bem‑vindo(a)!" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cliente-url">URL</Label>
                <Input id="cliente-url" value={clienteCfg.url} onChange={(e) => setClienteCfg({ ...clienteCfg, url: e.target.value })} placeholder="https://player.vimeo.com/video/123456789?h=xxxx" />
              </div>
              {clienteCfg.url && (
                <div className="rounded overflow-hidden bg-muted">
                  <div className="aspect-video">
                    <iframe src={clienteCfg.url} className="w-full h-full" frameBorder={0} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={clienteCfg.title || 'Boas‑vindas cliente'} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Materiais de apoio */}
        <Card>
          <CardHeader>
            <CardTitle>Materiais de apoio (PDF/JPG/PNG)</CardTitle>
            <CardDescription>Envie arquivos para leitura e anexe ao portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={handleUpload} />
            <div className="space-y-2">
              {files.length === 0 && (<p className="text-sm text-muted-foreground">Nenhum arquivo enviado</p>)}
              {files.map((f) => (
                <div key={f.id} className="flex items-center justify-between border rounded p-2">
                  <a href={f.url} target="_blank" rel="noreferrer" className="underline">{f.filename}</a>
                  <Button variant="outline" size="sm" onClick={async () => {
                    try {
                      await (await import('@/lib/api')).api.deleteFile(f.id);
                    } catch {}
                    setFiles((prev) => prev.filter((x) => x.id !== f.id));
                  }}>Remover</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading || saving}>Salvar</Button>
          <Button variant="outline" onClick={() => window.history.back()}>Voltar</Button>
        </div>
      </div>
    </Layout>
  );
}


