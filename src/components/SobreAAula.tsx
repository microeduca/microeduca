import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserRound, FileText } from 'lucide-react';
import type { SupportFile } from '@/types';

/**
 * Ficha da aula abaixo do player, no formato pedido pelo cliente: "Sobre o
 * mentor" e "Sobre a aula" como subtópicos, com os materiais numa aba ao lado
 * para não empurrar o texto para baixo.
 */
export default function SobreAAula({
  mentorName,
  mentorBio,
  mentorPhoto,
  descricao,
  materiais = [],
}: {
  mentorName?: string | null;
  mentorBio?: string | null;
  mentorPhoto?: SupportFile | null;
  descricao?: string | null;
  materiais?: SupportFile[];
}) {
  const temMentor = !!(mentorName || mentorBio);
  const temAlgo = temMentor || !!descricao || materiais.length > 0;
  if (!temAlgo) return null;

  return (
    <Card>
      <CardContent className="p-0">
        <Tabs defaultValue="sobre">
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="sobre"
              className="rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Sobre
            </TabsTrigger>
            <TabsTrigger
              value="materiais"
              className="rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Materiais
              {materiais.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] font-semibold">
                  {materiais.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sobre" className="mt-0 space-y-6 p-5">
            {temMentor && (
              <section>
                <h3 className="mb-3 text-sm font-semibold">Sobre o mentor</h3>
                <div className="flex gap-4">
                  {mentorPhoto?.url ? (
                    <img
                      src={mentorPhoto.url}
                      alt={mentorName || 'Mentor'}
                      className="h-14 w-14 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted">
                      <UserRound className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    {mentorName && <p className="font-medium leading-tight">{mentorName}</p>}
                    {mentorBio && (
                      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                        {mentorBio}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {descricao && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Sobre a aula</h3>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{descricao}</p>
              </section>
            )}

            {!temMentor && !descricao && (
              <p className="text-sm text-muted-foreground">
                Esta aula ainda não tem descrição.
              </p>
            )}
          </TabsContent>

          <TabsContent value="materiais" className="mt-0 p-5">
            {materiais.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum material vinculado a esta aula.
              </p>
            ) : (
              <div className="space-y-2">
                {materiais.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{file.filename}</span>
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {file.mimeType?.split('/').pop() || 'arquivo'}
                    </Badge>
                  </a>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
