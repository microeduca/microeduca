import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Download, Users, Clock, Eye, CheckCircle2, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDurationLong } from '@/lib/utils';
import { SkeletonEstatisticas, SkeletonTabela } from '@/components/LoadingState';
import { useToast } from '@/hooks/use-toast';

type Periodo = { de: string; ate: string };

const diasAtras = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const ATALHOS = [
  { rotulo: '7 dias', dias: 7 },
  { rotulo: '30 dias', dias: 30 },
  { rotulo: '90 dias', dias: 90 },
  { rotulo: 'Tudo', dias: 0 },
];

/** Converte para CSV com separador ponto e vírgula, que o Excel pt-BR abre direto. */
function baixarCsv(nome: string, linhas: Array<Record<string, unknown>>) {
  if (linhas.length === 0) return;
  const colunas = Object.keys(linhas[0]);
  const escapar = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    colunas.join(';'),
    ...linhas.map((l) => colunas.map((c) => escapar(l[c])).join(';')),
  ].join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nome}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const seg = (v: unknown) => formatDurationLong(Number(v) || 0);
const num = (v: unknown) => Number(v) || 0;

export default function AdminReports() {
  const { toast } = useToast();
  const [periodo, setPeriodo] = useState<Periodo>({ de: diasAtras(30), ate: '' });

  const intervalo = useMemo(() => ({
    from: periodo.de ? new Date(`${periodo.de}T00:00:00`).toISOString() : undefined,
    to: periodo.ate ? new Date(`${periodo.ate}T23:59:59`).toISOString() : undefined,
  }), [periodo]);

  const consulta = (nome: 'summary' | 'users' | 'content' | 'categories' | 'timeline' | 'access' | 'access-log') =>
    useQuery({
      queryKey: ['relatorio', nome, intervalo.from ?? '', intervalo.to ?? ''],
      queryFn: () => api.getReport(nome, intervalo.from, intervalo.to),
      staleTime: 60 * 1000,
    });

  const resumo = consulta('summary');
  const usuarios = consulta('users');
  const conteudos = consulta('content');
  const categorias = consulta('categories');
  const linhaDoTempo = consulta('timeline');
  const acessos = consulta('access');
  const registroAcessos = consulta('access-log');

  const s = resumo.data || {};
  const carregando = resumo.isLoading;

  const aplicarAtalho = (dias: number) =>
    setPeriodo(dias === 0 ? { de: '', ate: '' } : { de: diasAtras(dias), ate: '' });

  const exportar = (nome: string, dados: unknown) => {
    const linhas = Array.isArray(dados) ? dados : [];
    if (linhas.length === 0) {
      toast({ title: 'Nada para exportar', description: 'Não há dados no período selecionado.' });
      return;
    }
    baixarCsv(nome, linhas as Array<Record<string, unknown>>);
    toast({ title: 'Exportado', description: `${linhas.length} linha(s) em CSV.` });
  };

  const maiorDia = Math.max(1, ...(linhaDoTempo.data || []).map((d: Record<string, unknown>) => num(d.visualizacoes)));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-poppins font-bold">Relatórios</h1>
            <p className="text-muted-foreground">Utilização da plataforma no período selecionado</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Período</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={periodo.de} className="h-9 w-[160px]"
                     onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={periodo.ate} className="h-9 w-[160px]"
                     onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))} />
            </div>
            <div className="flex flex-wrap gap-2">
              {ATALHOS.map((a) => (
                <Button key={a.rotulo} variant="outline" size="sm" onClick={() => aplicarAtalho(a.dias)}>
                  {a.rotulo}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {carregando ? <SkeletonEstatisticas quantidade={4} /> : (
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { titulo: 'Usuários ativos no período', valor: num(s.usuarios_no_periodo),
                nota: `${num(s.usuarios_ativos)} de ${num(s.total_usuarios)} cadastrados`, icone: Users },
              { titulo: 'Horas consumidas', valor: seg(s.segundos_assistidos),
                nota: `acervo de ${seg(s.acervo_segundos)}`, icone: Clock },
              { titulo: 'Visualizações', valor: num(s.visualizacoes),
                nota: `${num(s.total_videos)} conteúdos publicados`, icone: Eye },
              { titulo: 'Conclusões', valor: num(s.conclusoes),
                nota: 'aulas marcadas como concluídas', icone: CheckCircle2 },
            ].map((c) => (
              <Card key={c.titulo}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{c.titulo}</CardTitle>
                    <c.icone className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{c.valor}</div>
                  <p className="text-xs text-muted-foreground">{c.nota}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="usuarios" className="space-y-4">
          <TabsList className="flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="usuarios">Por usuário</TabsTrigger>
            <TabsTrigger value="conteudos">Por conteúdo</TabsTrigger>
            <TabsTrigger value="pastas">Por pasta</TabsTrigger>
            <TabsTrigger value="evolucao">Evolução</TabsTrigger>
            <TabsTrigger value="acessos">Acessos ao portal</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Atividade por usuário</CardTitle>
                  <CardDescription>Ordenado por horas consumidas</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2"
                        onClick={() => exportar('usuarios', usuarios.data)}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {usuarios.isLoading ? <SkeletonTabela colunas={6} /> : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Acessos</TableHead>
                        <TableHead className="text-right">Concluídos</TableHead>
                        <TableHead className="text-right">Horas</TableHead>
                        <TableHead>Último login</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(usuarios.data || []).map((u: Record<string, unknown>) => (
                        <TableRow key={String(u.id)}>
                          <TableCell>
                            <div className="font-medium">{String(u.name)}</div>
                            <div className="text-xs text-muted-foreground">{String(u.email)}</div>
                          </TableCell>
                          <TableCell>
                            {u.is_active === false
                              ? <Badge variant="destructive">Inativo</Badge>
                              : <Badge variant="outline">Ativo</Badge>}
                          </TableCell>
                          <TableCell className="text-right">{num(u.visualizacoes)}</TableCell>
                          <TableCell className="text-right">{num(u.conclusoes)}</TableCell>
                          <TableCell className="text-right font-medium">{seg(u.segundos_assistidos)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {u.ultimo_login ? new Date(String(u.ultimo_login)).toLocaleString('pt-BR') : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(usuarios.data || []).length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                          Nenhum usuário cadastrado
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conteudos">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Conteúdos mais acessados</CardTitle>
                  <CardDescription>Inclui vídeos e materiais</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2"
                        onClick={() => exportar('conteudos', conteudos.data)}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {conteudos.isLoading ? <SkeletonTabela colunas={5} /> : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Conteúdo</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead className="text-right">Acessos</TableHead>
                        <TableHead className="text-right">Espectadores</TableHead>
                        <TableHead className="text-right">Horas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(conteudos.data || []).slice(0, 50).map((v: Record<string, unknown>) => (
                        <TableRow key={String(v.id)}>
                          <TableCell>
                            <div className="font-medium">{String(v.title)}</div>
                            <div className="text-xs text-muted-foreground">
                              {v.content_type === 'file' ? 'Material' : seg(v.duration)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {[v.categoria, v.modulo].filter(Boolean).join(' › ') || '—'}
                          </TableCell>
                          <TableCell className="text-right">{num(v.visualizacoes)}</TableCell>
                          <TableCell className="text-right">{num(v.espectadores)}</TableCell>
                          <TableCell className="text-right font-medium">{seg(v.segundos_assistidos)}</TableCell>
                        </TableRow>
                      ))}
                      {(conteudos.data || []).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          Nenhum conteúdo publicado
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pastas">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Pastas e categorias mais visualizadas</CardTitle>
                </div>
                <Button variant="outline" size="sm" className="gap-2"
                        onClick={() => exportar('pastas', categorias.data)}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {categorias.isLoading ? <SkeletonTabela colunas={5} /> : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pasta</TableHead>
                        <TableHead className="text-right">Conteúdos</TableHead>
                        <TableHead className="text-right">Acessos</TableHead>
                        <TableHead className="text-right">Espectadores</TableHead>
                        <TableHead className="text-right">Horas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(categorias.data || []).map((c: Record<string, unknown>) => (
                        <TableRow key={String(c.id)}>
                          <TableCell className="font-medium">{String(c.name)}</TableCell>
                          <TableCell className="text-right">{num(c.videos)}</TableCell>
                          <TableCell className="text-right">{num(c.visualizacoes)}</TableCell>
                          <TableCell className="text-right">{num(c.espectadores)}</TableCell>
                          <TableCell className="text-right font-medium">{seg(c.segundos_assistidos)}</TableCell>
                        </TableRow>
                      ))}
                      {(categorias.data || []).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          Nenhuma pasta cadastrada
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evolucao">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Evolução de acessos</CardTitle>
                  <CardDescription>Visualizações por dia no período</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2"
                        onClick={() => exportar('evolucao', linhaDoTempo.data)}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {linhaDoTempo.isLoading ? <SkeletonTabela colunas={3} /> : (
                  <div className="space-y-2">
                    {(linhaDoTempo.data || []).map((d: Record<string, unknown>) => (
                      <div key={String(d.dia)} className="flex items-center gap-3 text-sm">
                        <span className="w-24 shrink-0 text-muted-foreground">
                          {new Date(`${String(d.dia)}T12:00:00`).toLocaleDateString('pt-BR')}
                        </span>
                        <div className="h-4 flex-1 rounded bg-muted overflow-hidden">
                          <div className="h-full bg-primary/70 rounded"
                               style={{ width: `${(num(d.visualizacoes) / maiorDia) * 100}%` }} />
                        </div>
                        <span className="w-16 text-right">{num(d.visualizacoes)} acesso(s)</span>
                        <span className="w-24 text-right text-muted-foreground">{seg(d.segundos_assistidos)}</span>
                      </div>
                    ))}
                    {(linhaDoTempo.data || []).length === 0 && (
                      <div className="flex items-center gap-2 justify-center text-muted-foreground py-6">
                        <TrendingUp className="h-4 w-4" />
                        Nenhum acesso registrado no período
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acessos" className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Quem entrou no portal</CardTitle>
                  <CardDescription>
                    Entradas no sistema, independente de ter assistido algo
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2"
                        onClick={() => exportar('acessos-por-usuario', acessos.data)}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {acessos.isLoading ? <SkeletonTabela colunas={5} /> : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Entradas</TableHead>
                        <TableHead className="text-right">Dias com acesso</TableHead>
                        <TableHead>Último acesso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(acessos.data || []).map((u: Record<string, unknown>) => (
                        <TableRow key={String(u.id)}>
                          <TableCell>
                            <div className="font-medium">{String(u.name)}</div>
                            <div className="text-xs text-muted-foreground">{String(u.email)}</div>
                          </TableCell>
                          <TableCell>
                            {u.is_active === false
                              ? <Badge variant="destructive">Inativo</Badge>
                              : <Badge variant="outline">Ativo</Badge>}
                          </TableCell>
                          <TableCell className="text-right">{num(u.acessos)}</TableCell>
                          <TableCell className="text-right">{num(u.dias_distintos)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {u.ultimo_acesso
                              ? new Date(String(u.ultimo_acesso)).toLocaleString('pt-BR')
                              : 'nunca entrou'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(acessos.data || []).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          Nenhum usuário cadastrado
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Últimas entradas</CardTitle>
                  <CardDescription>Registro detalhado, com data e hora de cada acesso</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2"
                        onClick={() => exportar('registro-de-acessos', registroAcessos.data)}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {registroAcessos.isLoading ? <SkeletonTabela colunas={3} /> : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quando</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Origem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(registroAcessos.data || []).map((a: Record<string, unknown>, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{new Date(String(a.occurred_at)).toLocaleString('pt-BR')}</TableCell>
                          <TableCell>
                            <div className="font-medium">{String(a.name)}</div>
                            <div className="text-xs text-muted-foreground">{String(a.email)}</div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{String(a.ip || '—')}</TableCell>
                        </TableRow>
                      ))}
                      {(registroAcessos.data || []).length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          Nenhum acesso registrado no período
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
