import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, FolderOpen, FolderTree, Search, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/lib/supabase';
import { getModules, addModule, updateModule, deleteModule } from '@/lib/storage';
import { ModuleTree } from '@/components/ModuleTree';
import type { Module } from '@/types';

export default function AdminTaxonomy() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [modules, setModules] = useState<Array<{ id: string; title: string; parentId?: string | null; order: number }>>([]);
  const [catSearch, setCatSearch] = useState('');
  const [modSearch, setModSearch] = useState('');
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [editingId, setEditingId] = useState<string>('');
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState<string>('');
  const [editingCatName, setEditingCatName] = useState<string>('');
  const [editingCatDesc, setEditingCatDesc] = useState<string>('');

  useEffect(() => {
    (async () => {
      const cats = await getCategories();
      setCategories(cats);
      const first = cats[0]?.id || '';
      setSelectedCategoryId(first);
    })();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) { setModules([]); return; }
    (async () => {
      const list = await getModules(selectedCategoryId);
      setModules(list.map(m => ({ id: m.id, title: m.title, parentId: m.parentId ?? null, order: m.order })));
    })();
  }, [selectedCategoryId]);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => (catSearch ? (c.name || '').toLowerCase().includes(catSearch.toLowerCase()) : true));
  }, [categories, catSearch]);

  const allMods = useMemo(() => {
    return modules.filter(m => (modSearch ? (m.title || '').toLowerCase().includes(modSearch.toLowerCase()) : true));
  }, [modules, modSearch]);

  const roots = useMemo(() => allMods.filter(m => !m.parentId).sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title)), [allMods]);
  const childrenOf = (pid: string) => allMods.filter(m => m.parentId === pid).sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));

  const getSiblings = (module: { id: string; parentId?: string | null }) => {
    if (!module.parentId) return roots;
    return childrenOf(module.parentId);
  };

  // Converter para formato Module para usar com ModuleTree
  const modulesAsModuleType = useMemo(() => {
    return allMods.map(m => ({
      id: m.id,
      categoryId: selectedCategoryId,
      parentId: m.parentId,
      title: m.title,
      order: m.order,
    } as Module));
  }, [allMods, selectedCategoryId]);

  const refreshModules = async () => {
    const list = await getModules(selectedCategoryId);
    setModules(list.map(m => ({ id: m.id, title: m.title, parentId: m.parentId ?? null, order: m.order })));
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const row = await addCategory({ name: newCatName.trim(), description: newCatDesc.trim() });
      const cats = await getCategories();
      setCategories(cats);
      setNewCatName('');
      setNewCatDesc('');
      const newId = (row && (row as any).id) || cats[cats.length - 1]?.id || '';
      setSelectedCategoryId(newId);
      toast({ title: 'Categoria criada' });
    } catch {
      toast({ title: 'Erro ao criar categoria', variant: 'destructive' });
    }
  };

  const handleAddRoot = async () => {
    if (!newModuleTitle.trim() || !selectedCategoryId) return;
    try {
      const maxOrder = Math.max(0, ...roots.map(r => r.order || 0));
      await addModule({ categoryId: selectedCategoryId, parentId: null, title: newModuleTitle.trim(), order: maxOrder + 1 });
      setNewModuleTitle('');
      await refreshModules();
      toast({ title: 'Módulo criado' });
    } catch {
      toast({ title: 'Erro ao criar módulo', variant: 'destructive' });
    }
  };

  const handleAddChild = async (parentId: string) => {
    try {
      const siblings = childrenOf(parentId);
      const maxOrder = Math.max(0, ...siblings.map(r => r.order || 0));
      await addModule({ categoryId: selectedCategoryId, parentId, title: 'Novo submódulo', order: maxOrder + 1 });
      await refreshModules();
    } catch {
      toast({ title: 'Erro ao criar submódulo', variant: 'destructive' });
    }
  };

  const moveWithinSiblings = async (mod: { id: string; parentId?: string | null; order: number }, dir: 'up' | 'down') => {
    const list = (mod.parentId ? childrenOf(mod.parentId) : roots).slice();
    const idx = list.findIndex(m => m.id === mod.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx];
    const b = list[swapIdx];
    try {
      await updateModule(a.id, { order: b.order });
      await updateModule(b.id, { order: a.order });
      await refreshModules();
    } catch {
      toast({ title: 'Erro ao reordenar', variant: 'destructive' });
    }
  };

  // Drag-and-drop simples (mesma lista)
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDropReorder = async (
    e: React.DragEvent,
    target: { id: string; parentId?: string | null; order: number },
  ) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === target.id) return;
    const all = target.parentId ? childrenOf(target.parentId) : roots;
    const dragged = all.find(m => m.id === draggedId);
    if (!dragged) return;
    const list = all.slice();
    const from = list.findIndex(m => m.id === draggedId);
    const to = list.findIndex(m => m.id === target.id);
    if (from < 0 || to < 0) return;
    // swap orders
    try {
      await updateModule(dragged.id, { order: target.order });
      await updateModule(target.id, { order: dragged.order });
      await refreshModules();
    } catch { toast({ title: 'Erro ao reordenar', variant: 'destructive' }); }
  };

  const handleRename = (m: Module) => { setEditingId(m.id); setEditingTitle(m.title); };
  const saveRename = async (m: Module) => {
    try {
      await updateModule(m.id, { title: editingTitle.trim() || m.title });
      setEditingId(''); setEditingTitle('');
      await refreshModules();
    } catch { toast({ title: 'Erro ao renomear', variant: 'destructive' }); }
  };

  const handleDelete = async (m: Module) => {
    if (!confirm('Remover este módulo?')) return;
    try { await deleteModule(m.id); await refreshModules(); toast({ title: 'Módulo removido' }); }
    catch { toast({ title: 'Não foi possível remover (verifique filhos/vídeos).', variant: 'destructive' }); }
  };

  const handleMove = async (mod: Module, dir: 'up' | 'down') => {
    await moveWithinSiblings(mod, dir);
  };

  // Funções para categorias
  const refreshCategories = async () => {
    const cats = await getCategories();
    setCategories(cats);
  };

  const handleEditCategory = (cat: { id: string; name: string; description?: string }) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatDesc(cat.description || '');
  };

  const saveCategoryEdit = async () => {
    if (!editingCatName.trim()) return;
    try {
      await updateCategory(editingCatId, { 
        name: editingCatName.trim(), 
        description: editingCatDesc.trim() 
      });
      await refreshCategories();
      setEditingCatId('');
      setEditingCatName('');
      setEditingCatDesc('');
      toast({ title: 'Categoria atualizada' });
    } catch {
      toast({ title: 'Erro ao editar categoria', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja deletar a categoria "${name}"?\n\nIsso também removerá todos os módulos e vídeos associados a esta categoria.`)) return;
    try {
      await deleteCategory(id);
      await refreshCategories();
      // Se a categoria deletada era a selecionada, selecionar a primeira disponível
      if (selectedCategoryId === id) {
        const remainingCats = categories.filter(c => c.id !== id);
        setSelectedCategoryId(remainingCats[0]?.id || '');
      }
      toast({ title: 'Categoria deletada' });
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      toast({ title: 'Não foi possível deletar a categoria (verifique se não há vídeos associados)', variant: 'destructive' });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-poppins font-bold">Categorias & Módulos</h1>
            <p className="text-muted-foreground">Gerencie categorias e sua árvore de módulos em uma única página</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Categorias */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5" /> Categorias</CardTitle>
              <CardDescription>Selecione a categoria para editar seus módulos</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Criar categoria */}
              <div className="mb-3 grid md:grid-cols-3 gap-2">
                <div className="md:col-span-1">
                  <Label>Nova categoria</Label>
                  <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nome" />
                </div>
                <div className="md:col-span-2">
                  <Label className="invisible md:visible">Descrição</Label>
                  <Input value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} placeholder="Descrição (opcional)" />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <Button size="sm" onClick={handleAddCategory} disabled={!newCatName.trim()}><Plus className="h-4 w-4 mr-1" />Adicionar categoria</Button>
                </div>
              </div>
              <div className="mb-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder="Buscar categoria..." className="pl-9" />
              </div>
              <div className="max-h-[420px] overflow-auto divide-y rounded border">
                {filteredCategories.map(c => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between px-3 py-2 hover:bg-accent ${selectedCategoryId === c.id ? 'bg-accent' : ''}`}
                  >
                    <button
                      onClick={() => setSelectedCategoryId(c.id)}
                      className="flex-1 text-left"
                    >
                      {editingCatId === c.id ? (
                        <div className="space-y-2">
                          <Input 
                            value={editingCatName} 
                            onChange={(e) => setEditingCatName(e.target.value)} 
                            className="h-8" 
                            placeholder="Nome da categoria"
                          />
                          <Input 
                            value={editingCatDesc} 
                            onChange={(e) => setEditingCatDesc(e.target.value)} 
                            className="h-8" 
                            placeholder="Descrição (opcional)"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{c.description || '—'}</div>
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-1 ml-2">
                      {editingCatId === c.id ? (
                        <>
                          <Button size="sm" onClick={saveCategoryEdit} disabled={!editingCatName.trim()}>
                            Salvar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => { setEditingCatId(''); setEditingCatName(''); setEditingCatDesc(''); }}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleEditCategory(c)}
                            title="Editar categoria"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCategory(c.id, c.name)}
                            title="Deletar categoria"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {filteredCategories.length === 0 && (
                  <div className="px-3 py-8 text-center text-muted-foreground">Nenhuma categoria</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Módulos da categoria selecionada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FolderTree className="h-5 w-5" /> Módulos da Categoria</CardTitle>
              <CardDescription>Crie, renomeie e reordene módulos e submódulos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selectedCategoryId ? (
                <div className="text-muted-foreground">Selecione uma categoria à esquerda.</div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input placeholder="Novo módulo raiz" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} />
                    <Button onClick={handleAddRoot} disabled={!newModuleTitle.trim()}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar módulo..." value={modSearch} onChange={(e) => setModSearch(e.target.value)} className="pl-9" />
                  </div>
                  <div className="space-y-3 max-h-[460px] overflow-auto">
                    {roots.length === 0 ? (
                      <div className="text-muted-foreground">Nenhum módulo nesta categoria.</div>
                    ) : roots.map(root => {
                      const rootModule = modulesAsModuleType.find(m => m.id === root.id);
                      if (!rootModule) return null;
                      return (
                        <ModuleTree
                          key={root.id}
                          module={rootModule}
                          allModules={modulesAsModuleType}
                          level={0}
                          editingId={editingId}
                          editingTitle={editingTitle}
                          onEdit={handleRename}
                          onSaveEdit={saveRename}
                          onCancelEdit={() => { setEditingId(''); setEditingTitle(''); }}
                          onTitleChange={setEditingTitle}
                          onMove={handleMove}
                          onAddChild={(parent) => handleAddChild(parent.id)}
                          onDelete={handleDelete}
                          getSiblings={(m) => getSiblings(m)}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}


