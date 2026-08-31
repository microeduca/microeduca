import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { UserRound, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { uploadSupportFile } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import type { SupportFile } from '@/types';

export interface Ficha {
  mentorName?: string | null;
  mentorBio?: string | null;
  mentorPhoto?: SupportFile | null;
  description?: string | null;
}

type Mentor = { name: string; bio: string | null; photo: SupportFile | null };

/**
 * A descrição solta virou dois subtópicos, como o cliente pediu: quem dá a
 * aula e sobre o que ela é. Um só componente para os três lugares que
 * cadastram vídeo — os dois diálogos de AdminVideos e o envio ao Vimeo —
 * porque triplicar isso garantiria que os três divergissem com o tempo.
 */
export default function FichaDaAula({
  valor,
  aoMudar,
  idPrefixo = 'ficha',
}: {
  valor: Ficha;
  aoMudar: (mudanca: Partial<Ficha>) => void;
  idPrefixo?: string;
}) {
  const { toast } = useToast();
  const [mentores, setMentores] = useState<Mentor[]>([]);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const lista = (await api.getMentors()) as Mentor[];
        if (!cancelado) setMentores(Array.isArray(lista) ? lista : []);
      } catch {
        /* a lista é só uma conveniência; sem ela o cadastro continua manual */
      }
    })();
    return () => { cancelado = true; };
  }, []);

  /** Escolher um mentor já cadastrado traz a biografia e a foto junto. */
  const aoDigitarNome = (nome: string) => {
    const conhecido = mentores.find((m) => m.name === nome);
    if (conhecido && !valor.mentorBio && !valor.mentorPhoto) {
      aoMudar({ mentorName: nome, mentorBio: conhecido.bio, mentorPhoto: conhecido.photo });
      return;
    }
    aoMudar({ mentorName: nome });
  };

  const enviarFoto = async (arquivo: File) => {
    if (!arquivo.type.startsWith('image/')) {
      toast({ title: 'Use uma imagem', description: 'A foto do mentor precisa ser JPG ou PNG.', variant: 'destructive' });
      return;
    }
    setEnviandoFoto(true);
    try {
      aoMudar({ mentorPhoto: await uploadSupportFile(arquivo) });
    } catch (e) {
      toast({ title: 'Não foi possível enviar a foto', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setEnviandoFoto(false);
      if (arquivoRef.current) arquivoRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold">Sobre o mentor</legend>
        <p className="text-xs text-muted-foreground">
          Quem está dando a aula. Aparece para o aluno logo abaixo do vídeo.
        </p>

        <div className="flex flex-wrap items-start gap-4">
          <div className="flex flex-col items-center gap-2">
            {valor.mentorPhoto?.url ? (
              <img
                src={valor.mentorPhoto.url}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <UserRound className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <input
              ref={arquivoRef}
              id={`${idPrefixo}-foto`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarFoto(f); }}
            />
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={enviandoFoto}
                onClick={() => arquivoRef.current?.click()}
              >
                <Upload className="mr-1 h-3 w-3" />
                {enviandoFoto ? 'Enviando…' : 'Foto'}
              </Button>
              {valor.mentorPhoto && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => aoMudar({ mentorPhoto: null })}
                  aria-label="Remover foto"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <div className="min-w-[220px] flex-1 space-y-3">
            <div>
              <Label htmlFor={`${idPrefixo}-mentor`}>Nome</Label>
              <Input
                id={`${idPrefixo}-mentor`}
                list={`${idPrefixo}-mentores`}
                value={valor.mentorName || ''}
                onChange={(e) => aoDigitarNome(e.target.value)}
                placeholder="Ex.: Rodrigo Maroja"
              />
              <datalist id={`${idPrefixo}-mentores`}>
                {mentores.map((m) => <option key={m.name} value={m.name} />)}
              </datalist>
              {mentores.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Escolhendo alguém já cadastrado, a biografia e a foto vêm junto.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor={`${idPrefixo}-bio`}>Um pouco sobre a pessoa</Label>
              <Textarea
                id={`${idPrefixo}-bio`}
                value={valor.mentorBio || ''}
                onChange={(e) => aoMudar({ mentorBio: e.target.value })}
                rows={3}
                placeholder="Formação, experiência, o que faz na Micro…"
              />
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold">Sobre a aula</legend>
        <p className="text-xs text-muted-foreground">
          O que o colaborador vai aprender aqui.
        </p>
        <Textarea
          id={`${idPrefixo}-descricao`}
          value={valor.description || ''}
          onChange={(e) => aoMudar({ description: e.target.value })}
          rows={4}
          placeholder="Nesta aula, você vai aprender a…"
        />
      </fieldset>
    </div>
  );
}
