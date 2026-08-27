import { ReactNode, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { getCurrentUser, logout } from '@/lib/auth';
import { LogOut, User, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useNaoLidas } from '@/hooks/queries';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toast } = useToast();
  const [isPwdOpen, setIsPwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const key = `terms_accept_v1_${user.id}`;
    const accepted = localStorage.getItem(key) === 'true';
    if (!accepted) {
      setIsTermsOpen(true);
    }
  }, [user?.id]);

  // Revalida a sessão no servidor. Antes isso baixava a lista inteira de
  // perfis — com os hashes de senha — só para descobrir se o próprio usuário
  // ainda estava ativo.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await api.getMe();
        // Mantém assignedCategories/Modules e a liberação programada em dia
        // sem exigir novo login.
        if (!cancelled && me?.id) {
          const bruto = localStorage.getItem('microeduca_auth');
          if (bruto) {
            try {
              const atual = JSON.parse(bruto);
              localStorage.setItem('microeduca_auth', JSON.stringify({ ...atual, ...me }));
            } catch { /* sessão ilegível: o próximo 401 trata */ }
          }
        }
        if (!cancelled && me?.isActive === false) {
          toast({ title: 'Acesso inativo', description: 'Seu usuário foi inativado.', variant: 'destructive' });
          logout();
        }
      } catch {
        return;
      }
    })();
    return () => { cancelled = true; };
  }, [toast, user?.id]);

  const handleAcceptTerms = () => {
    if (!user?.id) return;
    const key = `terms_accept_v1_${user.id}`;
    localStorage.setItem(key, 'true');
    setIsTermsOpen(false);
  };

  const handleChangePassword = async () => {
    if (!user?.id) return;
    if (!newPwd || newPwd.length < 6) {
      toast({ title: 'A senha deve ter ao menos 6 caracteres', variant: 'destructive' });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: 'Confirmação de senha não confere', variant: 'destructive' });
      return;
    }
    try {
      setSavingPwd(true);
      await api.changePassword(user.id, currentPwd, newPwd);
      setIsPwdOpen(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      toast({ title: 'Senha atualizada com sucesso' });
    } catch (e: any) {
      toast({ title: 'Não foi possível alterar a senha', description: e?.message, variant: 'destructive' });
    } finally {
      setSavingPwd(false);
    }
  };

  // Mesma lista alimenta o menu do desktop e o do celular; antes a navegação
  // era hidden md:flex sem alternativa, então no telefone não havia menu algum.
  const naoLidas = useNaoLidas();
  const navegacao = user?.role === 'admin'
    ? [
        { rotulo: 'Dashboard', destino: '/admin' },
        { rotulo: 'Vídeos', destino: '/admin/videos' },
        { rotulo: 'Categorias & Módulos', destino: '/admin/taxonomia' },
        { rotulo: 'Usuários', destino: '/admin/users' },
        { rotulo: 'Avisos', destino: '/admin/avisos' },
        { rotulo: 'Mensagens', destino: '/admin/mensagens', contador: naoLidas },
        { rotulo: 'Relatórios', destino: '/admin/relatorios' },
      ]
    : [
        { rotulo: 'Meus Cursos', destino: '/meus-cursos' },
        { rotulo: 'Todos os Vídeos', destino: '/dashboard' },
        { rotulo: 'Histórico', destino: '/history' },
        { rotulo: 'Mensagens', destino: '/mensagens', contador: naoLidas },
      ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Cabeçalho no padrão do modelo enviado pela MICRO: faixa marrom com a
          marca à esquerda e a navegação numa segunda linha, em versalete, com
          sublinhado na página atual. */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <img
                src="/micro-simbolo-branco.png"
                alt=""
                aria-hidden
                className="h-7 w-auto shrink-0"
              />
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="font-marca text-xl font-bold tracking-wide">MICROEDUCA</span>
                <span className="hidden truncate font-marca text-[11px] font-medium uppercase tracking-[0.18em] opacity-75 sm:inline">
                  Portal de Treinamento
                </span>
              </span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="hidden h-4 w-4 opacity-70 sm:block" />
                    <button
                      type="button"
                      onClick={() => setIsPwdOpen(true)}
                      className="max-w-[9rem] truncate font-inter font-medium underline underline-offset-2 hover:opacity-80"
                      title="Alterar senha"
                    >
                      {user.name}
                    </button>
                    {user.role === 'admin' && (
                      <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        Admin
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                  >
                    <LogOut className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Sair</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                >
                  Entrar
                </Button>
              )}

              {user && (
                <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground md:hidden"
                      aria-label="Abrir menu"
                    >
                      <Menu className="h-5 w-5" />
                      {naoLidas > 0 && (
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary-foreground" />
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[260px]">
                    <SheetHeader>
                      <SheetTitle className="text-left">Navegação</SheetTitle>
                    </SheetHeader>
                    <nav className="mt-6 flex flex-col gap-1">
                      {navegacao.map((item) => (
                        <button
                          key={item.destino}
                          onClick={() => { setMenuAberto(false); navigate(item.destino); }}
                          className="flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                        >
                          {item.rotulo}
                          {!!item.contador && (
                            <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                              {item.contador}
                            </span>
                          )}
                        </button>
                      ))}
                    </nav>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>

          {user && (
            <nav className="hidden items-center gap-6 overflow-x-auto md:flex">
              {navegacao.map((item) => {
                const atual =
                  pathname === item.destino ||
                  (item.destino !== '/admin' && pathname.startsWith(`${item.destino}/`));
                return (
                  <button
                    key={item.destino}
                    onClick={() => navigate(item.destino)}
                    aria-current={atual ? 'page' : undefined}
                    className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 py-2.5 font-marca text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
                      atual
                        ? 'border-primary-foreground'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    {item.rotulo}
                    {!!item.contador && (
                      <span className="rounded-full bg-primary-foreground/25 px-1.5 text-[10px] font-semibold tracking-normal">
                        {item.contador}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-8">
          {children}
        </div>
      </main>
      
      <footer className="bg-secondary/50 border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground font-inter">
            © {new Date().getFullYear()} MicroEduca. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Alterar Senha Dialog */}
      <Dialog open={isPwdOpen} onOpenChange={setIsPwdOpen}>
        <DialogContent className="sm:max-w-[480px]" aria-describedby="change-password-desc">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription id="change-password-desc">Informe sua senha atual e a nova senha.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Senha atual</Label>
              <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Nova senha</Label>
              <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPwdOpen(false)}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={savingPwd}>{savingPwd ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Termos e Condições (primeiro login) */}
      <Dialog open={isTermsOpen} onOpenChange={(_open) => { /* bloqueado até aceitar ou sair */ }}>
        <DialogContent className="sm:max-w-[720px]" aria-describedby="terms-desc">
          <DialogHeader>
            <DialogTitle>Termos e Condições de Uso</DialogTitle>
            <DialogDescription id="terms-desc">
              Leia com atenção e aceite para continuar utilizando a plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-4 text-sm leading-relaxed">
            <p>
              A reprodução, distribuição, exibição pública ou qualquer outra forma de utilização não autorizada do conteúdo audiovisual apresentado nesta plataforma é estritamente proibida, conforme o código de ética e conduta assinado pelo integrante. Todos os vídeos, materiais e conteúdos disponíveis são de propriedade intelectual da Micro Centro Diagnóstico e estão protegidos pela legislação vigente, incluindo, mas não se limitando à Lei de Direitos Autorais (Lei 9.610/98).
            </p>
            <p>
              Além disso, todos os usuários desta plataforma concordam em cumprir com as disposições da Lei Geral de Proteção de Dados Pessoais (LGPD - Lei 13.709/18), comprometendo-se a não realizar qualquer coleta, armazenamento ou tratamento indevido de dados pessoais. Qualquer violação relacionada à privacidade e proteção de dados pessoais será tratada de acordo com as disposições legais e poderá resultar em penalidades, conforme previsto pela LGPD.
            </p>
            <p>
              A Micro Centro Diagnóstico se reserva o direito de tomar as medidas necessárias para garantir a proteção de seus direitos autorais e a conformidade com a LGPD.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input id="terms-accept" type="checkbox" checked={termsChecked} onChange={(e) => setTermsChecked(e.target.checked)} />
            <Label htmlFor="terms-accept">Li e concordo com os Termos e Condições de Uso</Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={logout}>Sair</Button>
            <Button onClick={handleAcceptTerms} disabled={!termsChecked}>Aceitar e continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
