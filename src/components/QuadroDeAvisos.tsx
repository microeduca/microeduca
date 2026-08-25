import { Card, CardContent } from '@/components/ui/card';
import { Megaphone } from 'lucide-react';
import { useAvisos } from '@/hooks/queries';

type Aviso = { id: string; title: string; body: string; created_at?: string };

/**
 * Avisos vigentes para o usuário. O servidor já filtra por grupo e por janela
 * de datas, então aqui é só apresentação — nada é escondido no cliente.
 */
export default function QuadroDeAvisos() {
  const { data: avisos = [] } = useAvisos(false);
  if ((avisos as Aviso[]).length === 0) return null;

  return (
    <div className="space-y-3">
      {(avisos as Aviso[]).map((a) => (
        <Card key={a.id} className="border-l-4 border-l-primary bg-primary/5">
          <CardContent className="flex gap-3 pt-4">
            <Megaphone className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 space-y-1">
              <p className="font-medium leading-tight">{a.title}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
              {a.created_at && (
                <p className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
