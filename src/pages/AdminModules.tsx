import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FolderTree } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCategories, getModules, addModule, updateModule, deleteModule } from '@/lib/storage';
import type { Category, Module } from '@/types';
import { ModuleTree } from '@/components/ModuleTree';

export default function AdminModules() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [editingId, setEditingId] = useState<string>('');
  const [editingTitle, setEditingTitle] = useState<string>('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const cats = await getCategories();
      setCategories(cats);
      const first = cats[0]?.id || '';
      setSelectedCategoryId(first);
      if (first) {
        const mods = await getModules(first);
        setModules(mods);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) return;
    (async () => {
      setLoading(true);
      const mods = await getModules(selectedCategoryId);
      setModules(mods);
      setLoading(false);
    })();
  }, [selectedCategoryId]);

  const roots = useMemo(() => modules
    .filter(m => !m.parentId)
    .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title))
  , [modules]);

  const childrenOf = (parentId: string) => modules
    .filter(m => m.parentId === parentId)
    .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));

  const getSiblings = (module: Module) => {
    if (!module.parentId) return roots;
    return childrenOf(module.parentId);
  };

  const refresh = async () => {
    if (!selectedCategoryId) return;
    const mods = await getModules(selectedCategoryId);
    setModules(mods);
  };

  const handleAddRoot = async () => {
    if (!newModuleTitle.trim() || !selectedCategoryId) return;
    try {
      const maxOrder = Math.max(0, ...roots.map(r => r.order || 0));
      await addModule({ categoryId: selectedCategoryId, parentId: null, title: newModuleTitle.trim(), order: maxOrder + 1 });
      setNewModuleTitle('');
      await refresh();
      toast({ title: 'Módulo criado' });
    } catch {
      toast({ title: 'Erro ao criar módulo', variant: 'destructive' });
    }
  };

  const handleAddChild = async (parent: Module) => {
    try {
      const siblings = childrenOf(parent.id);
      const maxOrder = Math.max(0, ...siblings.map(r => r.order || 0));
      await addModule({ categoryId: selectedCategoryId, parentId: parent.id, title: 'Novo submódulo', order: maxOrder + 1 });
      await refresh();
    } catch {
      toast({ title: 'Erro ao criar submódulo', variant: 'destructive' });
    }
  };

  const handleRename = async (mod: Module) => {
    setEditingId(mod.id);
    setEditingTitle(mod.title);
  };

  const saveRename = async (mod: Module) => {
    try {
      await updateModule(mod.id, { title: editingTitle.trim() || mod.title });
      setEditingId('');
      setEditingTitle('');
      await refresh();
    } catch {
      toast({ title: 'Erro ao renomear', variant: 'destructive' });
    }
  };

  const moveWithinSiblings = async (mod: Module, direction: 'up' | 'down') => {
    const list = (mod.parentId ? childrenOf(mod.parentId) : roots).slice();
    const idx = list.findIndex(m => m.id === mod.id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx];
    const b = list[swapIdx];
    try {
      await updateModule(a.id, { order: b.order });
      await updateModule(b.id, { order: a.order });
      await refresh();
    } catch {
      toast({ title: 'Erro ao reordenar', variant: 'destructive' });
    }
  };

  const handleDelete = async (mod: Module) => {
    if (!confirm('Remover este módulo?')) return;
    try {
      await deleteModule(mod.id);
      await refresh();
      toast({ title: 'Módulo removido' });
    } catch (e: any) {
      toast({ title: 'Não foi possível remover', description: 'Verifique se não há submódulos ou vídeos vinculados.', variant: 'destructive' });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-poppins font-bold">Módulos e Submódulos</h1>
            <p className="text-muted-foreground">Organize o conteúdo dentro das categorias</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Categoria</CardTitle>
            <CardDescription>Selecione a categoria para gerenciar seus módulos</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <div className="md:w-1/2">
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:w-1/2 flex gap-2">
              <Input placeholder="Nome do novo módulo" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} />
              <Button onClick={handleAddRoot} disabled={!selectedCategoryId || !newModuleTitle.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar módulo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FolderTree className="h-5 w-5" /> Estrutura</CardTitle>
            <CardDescription>
              Clique para renomear, adicionar submódulos, reordenar e remover. Você pode criar pastas dentro de pastas sem limite de profundidade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground">Carregando…</div>
            ) : roots.length === 0 ? (
              <div className="text-muted-foreground">Nenhum módulo nesta categoria.</div>
            ) : (
              <div className="space-y-4">
                {roots.map(root => (
                  <ModuleTree
                    key={root.id}
                    module={root}
                    allModules={modules}
                    level={0}
                    editingId={editingId}
                    editingTitle={editingTitle}
                    onEdit={handleRename}
                    onSaveEdit={saveRename}
                    onCancelEdit={() => { setEditingId(''); setEditingTitle(''); }}
                    onTitleChange={setEditingTitle}
                    onMove={moveWithinSiblings}
                    onAddChild={handleAddChild}
                    onDelete={handleDelete}
                    getSiblings={getSiblings}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}


