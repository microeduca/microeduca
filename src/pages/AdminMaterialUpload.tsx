import { useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getCategories } from '@/lib/storage';
import { useEffect } from 'react';
import { uploadSupportFile } from '@/lib/storage';
import { addVideo } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminMaterialUpload() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [fileInfo, setFileInfo] = useState<{ url: string; filename: string; mimeType: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => setCategories(await getCategories()))();
  }, []);

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
    await addVideo({
      title,
      description,
      video_url: fileInfo.url,
      thumbnail: fileInfo.mimeType.startsWith('image/') ? fileInfo.url : undefined,
      category_id: categoryId,
      duration: 0,
      uploaded_by: 'admin',
    } as any);
    toast({ title: 'Material cadastrado' });
    navigate('/admin/videos');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-poppins font-bold">Enviar Arquivo</h1>
          <p className="text-muted-foreground">Anexe um PDF ou imagem e publique como material</p>
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
              <Label>Arquivo (PDF/JPG/PNG) *</Label>
              <Input type="file" accept="application/pdf,image/jpeg,image/png" ref={inputRef} onChange={onUpload} />
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


