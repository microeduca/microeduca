import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useMensagens } from '@/hooks/queries';
import { useToast } from '@/hooks/use-toast';

type Mensagem = {
  id: string;
  body: string;
  from_admin: boolean;
  created_at: string;
  sender_name?: string | null;
};

interface Props {
  /** Conversa a exibir. Vazio = a do próprio usuário logado. */
  userId?: string;
  /** true quando quem está vendo é o administrador. */
  comoAdmin?: boolean;
  ativo?: boolean;
}

export default function Conversa({ userId, comoAdmin = false, ativo = true }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: mensagens = [], isLoading } = useMensagens(userId, ativo);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  // Rola para a última mensagem sempre que a conversa cresce.
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [(mensagens as Mensagem[]).length]);

  const enviar = async () => {
    const corpo = texto.trim();
    if (!corpo) return;
    try {
      setEnviando(true);
      await api.sendMessage(corpo, userId);
      setTexto('');
      await qc.invalidateQueries({ queryKey: ['mensagens'] });
      await qc.invalidateQueries({ queryKey: ['mensagens-threads'] });
      await qc.invalidateQueries({ queryKey: ['mensagens-nao-lidas'] });
    } catch (e) {
      toast({ title: 'Não foi possível enviar', description: (e as Error)?.message, variant: 'destructive' });
    } finally {
      setEnviando(false);
    }
  };

  const lista = mensagens as Mensagem[];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 p-1">
        {isLoading && <p className="text-sm text-muted-foreground text-center py-6">Carregando…</p>}
        {!isLoading && lista.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {comoAdmin
              ? 'Nenhuma mensagem nesta conversa ainda.'
              : 'Nenhuma mensagem ainda. Escreva abaixo para falar com a administração.'}
          </p>
        )}
        {lista.map((m) => {
          // "Minha" mensagem depende de quem está olhando.
          const minha = comoAdmin ? m.from_admin : !m.from_admin;
          return (
            <div key={m.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                minha ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {!minha && (
                  <p className="text-xs font-medium opacity-80 mb-0.5">
                    {m.from_admin ? (m.sender_name || 'Administração') : (m.sender_name || 'Usuário')}
                  </p>
                )}
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={`text-[10px] mt-1 ${minha ? 'opacity-70' : 'text-muted-foreground'}`}>
                  {new Date(m.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={fim} />
      </div>

      <div className="border-t pt-3 mt-3 space-y-2">
        <Textarea
          rows={2}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva sua mensagem…"
          onKeyDown={(e) => {
            // Enter envia; Shift+Enter quebra linha.
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Enter envia · Shift+Enter quebra linha</span>
          <Button size="sm" className="gap-2" onClick={enviar} disabled={enviando || !texto.trim()}>
            <Send className="h-4 w-4" />
            {enviando ? 'Enviando…' : 'Enviar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
