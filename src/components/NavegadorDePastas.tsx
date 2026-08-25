import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, Folder, Home, Play, CheckCircle2, FileText } from 'lucide-react';
import { aggregateModuleContent, formatDurationLong, isActualVideo } from '@/lib/utils';

type Modulo = { id: string; title: string; parentId?: string | null; categoryId?: string; evaluationUrl?: string | null };
type Categoria = { id: string; name: string; description?: string };
type Video = {
  id: string; title: string; duration?: number; thumbnail?: string;
  moduleId?: string; module_id?: string;
  categoryId?: string; category_id?: string; category_ids?: string[];
  has_form?: boolean; hasForm?: boolean;
};
type Historico = { videoId: string; completed?: boolean; watchedDuration?: number };

const categoriasDoVideo = (v: Video): string[] =>
  v.category_ids && v.category_ids.length
    ? v.category_ids
    : [v.categoryId || v.category_id].filter(Boolean) as string[];

const moduloDoVideo = (v: Video): string | undefined => v.moduleId || v.module_id || undefined;

/**
 * Home em pastas: a MICRO pediu para a tela abrir só com os nomes das pastas,
 * e os vídeos aparecerem depois de entrar. A árvore é montada a partir dos
 * vídeos que o servidor já liberou para este usuário — uma pasta sem nenhum
 * conteúdo visível simplesmente não existe aqui, que era como setores alheios
 * apareciam na listagem anterior.
 *
 * A posição vai na URL (?pasta=&modulo=) para que o botão voltar do navegador
 * funcione e o usuário possa guardar o endereço de uma pasta.
 */
export default function NavegadorDePastas({
  categorias,
  videos,
  modulosPorCategoria,
  historico = [],
}: {
  categorias: Categoria[];
  videos: Video[];
  modulosPorCategoria: Record<string, Modulo[]>;
  historico?: Historico[];
}) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const categoriaAtual = params.get('pasta');
  const moduloAtual = params.get('modulo');

  const conteudos = useMemo(() => videos.filter(isActualVideo), [videos]);

  const modulos = useMemo(
    () => Object.values(modulosPorCategoria).flat() as Modulo[],
    [modulosPorCategoria],
  );
  const moduloPorId = useMemo(() => new Map(modulos.map((m) => [m.id, m])), [modulos]);

  /** Vídeos visíveis de uma categoria. */
  const videosDaCategoria = (categoriaId: string) =>
    conteudos.filter((v) => categoriasDoVideo(v).includes(categoriaId));

  /** Uma pasta só aparece se ela, ou alguma subpasta, tiver conteúdo liberado. */
  const temConteudo = (moduloId: string) =>
    aggregateModuleContent(moduloId, modulos, conteudos).videos > 0;

  const irPara = (pasta: string | null, modulo: string | null) => {
    const novo = new URLSearchParams();
    if (pasta) novo.set('pasta', pasta);
    if (modulo) novo.set('modulo', modulo);
    setParams(novo);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Trilha: Início › Categoria › Módulo › Submódulo
  const trilha = useMemo(() => {
    const itens: Array<{ rotulo: string; pasta: string | null; modulo: string | null }> = [];
    if (categoriaAtual) {
      const cat = categorias.find((c) => c.id === categoriaAtual);
      itens.push({ rotulo: cat?.name || 'Pasta', pasta: categoriaAtual, modulo: null });
    }
    const cadeia: Modulo[] = [];
    let atual = moduloAtual ? moduloPorId.get(moduloAtual) : undefined;
    const vistos = new Set<string>();
    while (atual && !vistos.has(atual.id)) {
      vistos.add(atual.id);
      cadeia.unshift(atual);
      atual = atual.parentId ? moduloPorId.get(atual.parentId) : undefined;
    }
    for (const m of cadeia) itens.push({ rotulo: m.title, pasta: categoriaAtual, modulo: m.id });
    return itens;
  }, [categoriaAtual, moduloAtual, categorias, moduloPorId]);

  // O que mostrar no nível atual
  const pastas = useMemo(() => {
    if (!categoriaAtual) {
      return categorias
        .filter((c) => videosDaCategoria(c.id).length > 0)
        .map((c) => {
          const lista = videosDaCategoria(c.id);
          return {
            id: c.id,
            titulo: c.name,
            descricao: c.description,
            quantidade: lista.length,
            duracao: lista.reduce((soma, v) => soma + (Number(v.duration) || 0), 0),
            alvo: () => irPara(c.id, null),
          };
        });
    }
    const doNivel = (modulosPorCategoria[categoriaAtual] || []).filter((m) =>
      moduloAtual ? m.parentId === moduloAtual : !m.parentId,
    );
    return doNivel
      .filter((m) => temConteudo(m.id))
      .map((m) => {
        const total = aggregateModuleContent(m.id, modulos, conteudos);
        return {
          id: m.id,
          titulo: m.title,
          descricao: undefined as string | undefined,
          quantidade: total.videos,
          duracao: total.duration,
          alvo: () => irPara(categoriaAtual, m.id),
        };
      });
  }, [categoriaAtual, moduloAtual, categorias, modulosPorCategoria, conteudos, modulos]);

  /** Aulas presas a este nível — no topo da categoria, as que não têm módulo. */
  const aulas = useMemo(() => {
    if (!categoriaAtual) return [];
    const daCategoria = videosDaCategoria(categoriaAtual);
    return moduloAtual
      ? daCategoria.filter((v) => moduloDoVideo(v) === moduloAtual)
      : daCategoria.filter((v) => !moduloDoVideo(v));
  }, [categoriaAtual, moduloAtual, conteudos]);

  const progressoDe = (videoId: string, duracao?: number) => {
    const h = historico.find((x) => x.videoId === videoId);
    if (!h) return null;
    if (h.completed) return { concluido: true, percentual: 100 };
    const total = Number(duracao) || 0;
    const pct = total > 0 ? Math.min(100, Math.round(((h.watchedDuration || 0) / total) * 100)) : 0;
    return pct > 0 ? { concluido: false, percentual: pct } : null;
  };

  const avaliacao = moduloAtual ? moduloPorId.get(moduloAtual)?.evaluationUrl : null;

  return (
    <div className="space-y-4">
      {/* Trilha */}
      <nav aria-label="Trilha de navegação">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li>
            <button
              onClick={() => irPara(null, null)}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              Início
            </button>
          </li>
          {trilha.map((item, i) => {
            const ultimo = i === trilha.length - 1;
            return (
              <li key={`${item.rotulo}-${i}`} className="flex min-w-0 items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                {ultimo ? (
                  <span className="truncate font-medium text-foreground" aria-current="page">{item.rotulo}</span>
                ) : (
                  <button
                    onClick={() => irPara(item.pasta, item.modulo)}
                    className="truncate hover:text-foreground transition-colors"
                  >
                    {item.rotulo}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Pastas do nível */}
      {pastas.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pastas.map((p) => (
            <button key={p.id} onClick={p.alvo} className="text-left">
              <Card className="h-full border-l-4 border-l-primary transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-3 p-4">
                  <Folder className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight">{p.titulo}</p>
                    {p.descricao && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{p.descricao}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.quantidade} {p.quantidade === 1 ? 'conteúdo' : 'conteúdos'}
                      {p.duracao > 0 && ` · ${formatDurationLong(p.duracao)}`}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Aulas do nível */}
      {aulas.length > 0 && (
        <div className="space-y-2">
          {pastas.length > 0 && (
            <h3 className="pt-2 text-sm font-medium text-muted-foreground">
              Aulas desta pasta ({aulas.length})
            </h3>
          )}
          {aulas.map((v) => {
            const p = progressoDe(v.id, v.duration);
            return (
              <Card
                key={v.id}
                onClick={() => navigate(`/video/${v.id}`)}
                className="cursor-pointer border-l-4 border-l-transparent transition-colors hover:border-l-primary hover:bg-accent/40"
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {p?.concluido ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Play className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{v.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {!!v.duration && <span>{formatDurationLong(v.duration)}</span>}
                      {(v.has_form || v.hasForm) && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3" /> com formulário
                        </span>
                      )}
                    </div>
                    {p && !p.concluido && <Progress value={p.percentual} className="mt-1.5 h-1" />}
                  </div>
                  {p?.concluido && <Badge variant="secondary" className="shrink-0">Concluído</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {avaliacao && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">Avaliação desta pasta</p>
              <p className="text-sm text-muted-foreground">Responda depois de concluir as aulas.</p>
            </div>
            <a
              href={avaliacao}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Abrir avaliação
            </a>
          </CardContent>
        </Card>
      )}

      {pastas.length === 0 && aulas.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Esta pasta ainda não tem conteúdo liberado para você.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
