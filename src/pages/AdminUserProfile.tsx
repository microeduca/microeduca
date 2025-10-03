import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getUsers, getVideos, getViewHistory } from '@/lib/storage';
import { Clock3, Play, CheckCircle2, User as UserIcon, Mail, ArrowLeft } from 'lucide-react';

export default function AdminUserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [users, vs, vh] = await Promise.all([
        getUsers(),
        getVideos(),
        getViewHistory(userId),
      ]);
      setUser(users.find((u) => u.id === userId) || null);
      setVideos(vs);
      setHistory(vh || []);
      setLoading(false);
    })();
  }, [userId]);

  const rows = useMemo(() => {
    const items = (history || []).map((h) => {
      const v = videos.find((x) => x.id === h.videoId);
      const duration = Number(v?.duration || 0);
      const watched = Number(h.watchedDuration || 0);
      const progress = duration > 0 ? Math.min(100, Math.round((watched / duration) * 100)) : (h.completed ? 100 : 0);
      const status = h.completed ? 'Concluído' : (watched > 0 ? 'Parcial' : '—');
      const thumb = v?.thumbnail || (v?.vimeoId ? `https://vumbnail.com/${v.vimeoId}.jpg` : undefined);
      return { ...h, video: v, progress, status, thumb };
    });
    return items.sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());
  }, [history, videos]);

  const stats = {
    total: rows.length,
    completed: rows.filter((r) => r.completed).length,
    inProgress: rows.filter((r) => !r.completed && (r.watchedDuration || 0) > 0).length,
    watchTimeH: Math.floor(rows.reduce((acc, r) => acc + (r.watchedDuration || 0), 0) / 3600),
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="py-16 text-center"><CardContent>Carregando…</CardContent></Card>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="py-16 text-center"><CardContent>Usuário não encontrado.</CardContent></Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-poppins font-bold">Perfil do Usuário</h1>
            <p className="text-muted-foreground">Acompanhe o que foi assistido por este usuário</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/users')} className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        </div>

        {/* Header do usuário */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription className="flex items-center gap-2"><Mail className="h-4 w-4" /> {user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Total de vídeos</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Concluídos</div>
                <div className="text-2xl font-bold">{stats.completed}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Em progresso</div>
                <div className="text-2xl font-bold">{stats.inProgress}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Tempo assistido</div>
                <div className="text-2xl font-bold">{stats.watchTimeH}h</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vídeo</TableHead>
                  <TableHead>Assistido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quando</TableHead>
                  <TableHead className="w-[1%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className={r.completed ? 'bg-green-50/50 dark:bg-green-950/20' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-16 aspect-video overflow-hidden rounded bg-muted">
                          {r.thumb ? (
                            <img src={r.thumb} alt={r.video?.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">—</div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{r.video?.title || r.videoId}</div>
                          <div className="text-xs text-muted-foreground">{r.progress}% concluído</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{Math.floor((r.watchedDuration || 0) / 60)} min</TableCell>
                    <TableCell>
                      {r.completed ? (
                        <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><Clock3 className="h-3 w-3" /> Parcial</Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(r.lastWatchedAt).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/video/${r.video?.id || r.videoId}`)}>
                        <Play className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sem histórico para este usuário</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}


