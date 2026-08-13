import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

/** Faixa de cartões de indicador. */
export function SkeletonEstatisticas({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: quantidade }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Grade de cartões de curso ou vídeo. */
export function SkeletonCartoes({ quantidade = 6 }: { quantidade?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: quantidade }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-2 w-full" />
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Linhas de tabela. */
export function SkeletonTabela({ linhas = 5, colunas = 5 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          {Array.from({ length: colunas }).map((_, j) => (
            <Skeleton key={j} className={j === 0 ? 'h-4 flex-[2]' : 'h-4 flex-1'} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Faixa discreta para revalidação em segundo plano: os dados já estão na tela
 * vindos do cache, então não faz sentido substituí-los por esqueletos.
 */
export function IndicadorAtualizando({ visivel }: { visivel: boolean }) {
  if (!visivel) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
      <Loader2 className="h-3 w-3 animate-spin" />
      Atualizando…
    </div>
  );
}
