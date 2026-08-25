import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Megaphone, Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAvisos, chaves } from '@/hooks/queries';
import { SkeletonTabela } from '@/components/LoadingState';
import { useToast } from '@/hooks/use-toast';
import { ROTULO_GRUPO, type GrupoUsuario } from '@/types';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/utils';

type Aviso = {
  id: string;
  title: string;
  body: string;
  target_groups: string[];
  starts_at: string | null;
  ends_at: string | null;
};

const VAZIO = { id: '', title: '', body: '', target_groups: [] as string[], starts_at: '', ends_at: '' };

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: avisos = [], isLoading } = useAvisos(true);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ ...VAZIO });
  const [salvando, setSalvando] = useState(false);

  const editando = !!form.id;

  const abrirNovo = () => { setForm({ ...VAZIO }); setAberto(true); };
  const abrirEdicao = (a: Aviso) => {
    setForm({
      id: a.id,
      title: a.title,
      body: a.body,
      target_groups: a.target_groups || [],
      starts_at: toDateTimeLocalValue(a.starts_at),
      ends_at: toDateTimeLocalValue(a.ends_at),
    });
    setAberto(true);
  };

  const alternarGrupo = (g: GrupoUsuario) =>
    setForm((f) => ({
      ...f,
      target_groups: f.target_groups.includes(g)
        ? f.target_groups.filter((x) => x !== g)
        : [...f.target_groups, g],
    }));

  const salvar = async () => {
    const payload = {
      title: form.title,
      body: form.body,
      target_groups: form.target_groups,
      starts_at: fromDateTimeLocalValue(form.starts_at),
      ends_at: fromDateTimeLocalValue(form.ends_at),
    };
    try {
      setSalvando(true);
      if (editando) await api.updateAnnouncement(form.id, payload);
      else await api.addAnnouncement(payload);
      await qc.invalidateQueries({ queryKey: ['avisos'] });
      setAberto(false);
      toast({ title: editando ? 'Aviso atualizado' : 'Aviso publicado' });
    } catch (e) {
      toast({ title: 'Não foi possível salvar', description: (e as Error)?.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (a: Aviso) => {
    if (!confirm(`Excluir o aviso "${a.title}"?`)) return;
    await api.deleteAnnouncement(a.id);
    await qc.invalidateQueries({ queryKey: ['avisos'] });
    toast({ title: 'Aviso excluído' });
  };

  /** Um aviso pode estar publicado mas fora da janela de datas. */
  const situacao = (a: Aviso) => {
    const agora = Date.now();
    if (a.starts_at && new Date(a.starts_at).getTime() > agora) return { texto: 'Agendado', variante: 'secondary' as const };
    if (a.ends_at && new Date(a.ends_at).getTime() < agora) return { texto: 'Encerrado', variante: 'outline' as const };
    return { texto: 'Vigente', variante: 'default' as const };
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-poppins font-bold">Quadro de Avisos</h1>
            <p className="text-muted-foreground">
              Comunicados exibidos na página inicial dos usuários
            </p>
          </div>
          <Button onClick={abrirNovo} className="gap-2">
            <Plus className="h-4 w-4" /> Novo aviso
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-5 w-5" />
              Avisos cadastrados
            </CardTitle>
            <CardDescription>
              Sem grupo marcado, o aviso aparece para todos. Marcando um grupo, só quem
              pertence a ele enxerga.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <SkeletonTabela colunas={5} /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aviso</TableHead>
                    <TableHead>Direcionado a</TableHead>
                    <TableHead>Exibição</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(avisos as Aviso[]).map((a) => {
                    const s = situacao(a);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-medium">{a.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2 max-w-md">{a.body}</div>
                        </TableCell>
                        <TableCell>
                          {(a.target_groups || []).length === 0
                            ? <span className="text-xs text-muted-foreground">Todos</span>
                            : (a.target_groups || []).map((g) => (
                                <Badge key={g} variant="secondary" className="mr-1">
                                  {ROTULO_GRUPO[g as GrupoUsuario] || g}
                                </Badge>
                              ))}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.starts_at ? new Date(a.starts_at).toLocaleDateString('pt-BR') : 'desde já'}
                          {' até '}
                          {a.ends_at ? new Date(a.ends_at).toLocaleDateString('pt-BR') : 'sem fim'}
                        </TableCell>
                        <TableCell><Badge variant={s.variante}>{s.texto}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => abrirEdicao(a)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => excluir(a)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(avisos as Aviso[]).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum aviso publicado ainda
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar aviso' : 'Novo aviso'}</DialogTitle>
              <DialogDescription>Aparece na página inicial de quem estiver no público escolhido.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="aviso-titulo">Título *</Label>
                <Input id="aviso-titulo" value={form.title}
                       onChange={(e) => setForm({ ...form, title: e.target.value })}
                       placeholder="Ex.: Treinamento obrigatório de biossegurança" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="aviso-texto">Texto *</Label>
                <Textarea id="aviso-texto" rows={4} value={form.body}
                          onChange={(e) => setForm({ ...form, body: e.target.value })}
                          placeholder="Escreva o comunicado" />
              </div>
              <div className="grid gap-2">
                <Label>Direcionar a</Label>
                <div className="flex flex-wrap gap-4">
                  {(['em_treinamento', 'efetivo'] as GrupoUsuario[]).map((g) => (
                    <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={form.target_groups.includes(g)} onCheckedChange={() => alternarGrupo(g)} />
                      {ROTULO_GRUPO[g]}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Deixe ambos desmarcados para exibir a todos os usuários.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="aviso-inicio">Exibir a partir de</Label>
                  <Input id="aviso-inicio" type="datetime-local" value={form.starts_at}
                         onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="aviso-fim">Exibir até</Label>
                  <Input id="aviso-fim" type="datetime-local" value={form.ends_at}
                         onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Datas em branco significam “desde já” e “sem prazo”.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
              <Button onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Publicar aviso'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
