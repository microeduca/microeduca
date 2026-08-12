import { useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getCategories, getModules } from '@/lib/storage';
import { useEffect } from 'react';
import { uploadSupportFile } from '@/lib/storage';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { fromDateTimeLocalValue } from '@/lib/utils';

export default function AdminMaterialUpload() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [releaseAt, setReleaseAt] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [fileInfo, setFileInfo] = useState<{ url: string; filename: string; mimeType: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => setCategories(await getCategories()))();
  }, []);

  // Módulos da categoria escolhida, para o material cair na subpasta certa.
  useEffect(() => {
    (async () => {
      if (!categoryId) { setModules([]); setModuleId(''); return; }
      setModules(await getModules(categoryId));
      setModuleId('');
    })();
  }, [categoryId]);

  // Indenta submódulos para a hierarquia ficar legível no select.
  const moduleOptions = (() => {
    const byParent = new Map<string, any[]>();
    for (const m of modules) {
      const key = m.parentId || '';
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(m);
    }
    const out: Array<{ id: string; label: string }> = [];
    const walk = (parent: string, level: number) => {
      for (const m of (byParent.get(parent) || []).sort((a, b) => (a.order || 0) - (b.order || 0))) {
        out.push({ id: m.id, label: `${'— '.repeat(level)}${m.title}` });
        walk(m.id, level + 1);
      }
    };
    walk('', 0);
    return out;
  })();

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const res = await uploadSupportFile(f);
      setFileInfo({ url: res.url, filename: res.filename, mimeType: res.mimeType });
      toast({ title: 'Arquivo enviado' });
    } catch (err: any) {
      toast({ title: 'Falha ao enviar arquivo', description: err?.message, variant: 'destructive' });
    } finally {
      e.currentTarget.value = '';
    }
  };

  const onSave = async () => {
    if (!title || !categoryId || !fileInfo?.url) {
      toast({ title: 'Preencha título, categoria e anexar arquivo', variant: 'destructive' });
      return;
    }
    await api.addVideo({
      title,
      description,
      video_url: fileInfo.url,
      thumbnail: fileInfo.mimeType.startsWith('image/') ? fileInfo.url : undefined,
      category_id: categoryId,
      category_ids: [categoryId],
      module_id: moduleId || undefined,
      duration: 0,
      uploaded_by: 'admin',
      content_type: 'file',
      release_at: fromDateTimeLocalValue(releaseAt),
    } as any);
    toast({ title: 'Material cadastrado' });
    navigate('/admin/videos');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-poppins font-bold">Enviar Arquivo</h1>
              <p className="text-muted-foreground">Anexe PDF, imagem, documento, planilha ou apresentação e publique como material</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do material</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do material" />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição rápida" />
            </div>
            <div className="grid gap-2">
              <Label>Categoria *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Módulo / Subpasta</Label>
              <Select value={moduleId} onValueChange={setModuleId} disabled={!categoryId || moduleOptions.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    !categoryId ? 'Selecione uma categoria primeiro'
                    : moduleOptions.length === 0 ? 'Nenhum módulo nesta categoria'
                    : 'Opcional — deixe vazio para a raiz da categoria'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {moduleOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Liberação programada</Label>
              <Input type="datetime-local" value={releaseAt} onChange={(e) => setReleaseAt(e.target.value)} />
              <p className="text-xs text-muted-foreground">Deixe vazio para liberar imediatamente.</p>
            </div>
            <div className="grid gap-2">
              <Label>Arquivo *</Label>
              <Input type="file" accept="application/pdf,image/jpeg,image/png,text/plain,text/csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx" ref={inputRef} onChange={onUpload} />
              {fileInfo?.url && (
                <div className="text-sm text-muted-foreground">{fileInfo.filename}</div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={onSave} disabled={!fileInfo?.url || !title || !categoryId}>Salvar</Button>
              <Button variant="outline" onClick={() => navigate('/admin/videos')}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}



