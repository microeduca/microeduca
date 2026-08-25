import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Search } from 'lucide-react';
import { useThreads } from '@/hooks/queries';
import Conversa from '@/components/Conversa';
import { SkeletonTabela } from '@/components/LoadingState';
import { ROTULO_GRUPO, type GrupoUsuario } from '@/types';

type Thread = {
  user_id: string;
  name: string;
  email: string;
  user_group: string | null;
  total: number;
  nao_lidas: number;
  ultima_em: string;
  ultima_mensagem: string;
};

export default function AdminMessages() {
  const { data: threads = [], isLoading } = useThreads();
  const [selecionado, setSelecionado] = useState<Thread | null>(null);
  const [busca, setBusca] = useState('');

  const lista = (threads as Thread[]).filter((t) => {
    const termo = busca.trim().toLowerCase();
    return !termo || t.name.toLowerCase().includes(termo) || t.email.toLowerCase().includes(termo);
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-poppins font-bold">Mensagens</h1>
          <p className="text-muted-foreground">Conversas individuais com os usuários do portal</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Card className="min-h-[520px]">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-5 w-5" />
                Conversas
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 h-9" placeholder="Buscar usuário..."
                       value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? <div className="p-4"><SkeletonTabela linhas={4} colunas={2} /></div> : (
                <div className="divide-y max-h-[440px] overflow-y-auto">
                  {lista.map((t) => (
                    <button
                      key={t.user_id}
                      onClick={() => setSelecionado(t)}
                      className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${
                        selecionado?.user_id === t.user_id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.ultima_mensagem}</p>
                        </div>
                        {Number(t.nao_lidas) > 0 && (
                          <Badge className="shrink-0">{t.nao_lidas}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {t.user_group && (
                          <Badge variant="secondary" className="text-[10px]">
                            {ROTULO_GRUPO[t.user_group as GrupoUsuario] || t.user_group}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(t.ultima_em).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </button>
                  ))}
                  {lista.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-10 px-4">
                      {(threads as Thread[]).length === 0
                        ? 'Nenhum usuário iniciou conversa ainda.'
                        : 'Nenhuma conversa corresponde à busca.'}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-h-[520px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">
                {selecionado ? selecionado.name : 'Selecione uma conversa'}
              </CardTitle>
              <CardDescription>
                {selecionado ? selecionado.email : 'A lista ao lado mostra quem escreveu para a administração'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col">
              {selecionado
                ? <Conversa userId={selecionado.user_id} comoAdmin />
                : (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Nenhuma conversa aberta
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
