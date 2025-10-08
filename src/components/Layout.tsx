import { ReactNode, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { getCurrentUser, logout } from '@/lib/auth';
import { LogOut, User, BookOpen, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPwdOpen, setIsPwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const key = `terms_accept_v1_${user.id}`;
    const accepted = localStorage.getItem(key) === 'true';
    if (!accepted) {
      setIsTermsOpen(true);
    }
  }, [user?.id]);

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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-background border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="font-poppins font-bold text-xl bg-gradient-primary bg-clip-text text-transparent">
                  MicroEduca
                </span>
              </button>
              
              {user && (
                <nav className="hidden md:flex items-center space-x-6">
                  {user.role === 'admin' ? (
                    <>
                      <button
                        onClick={() => navigate('/admin')}
                        className="text-muted-foreground hover:text-foreground transition-colors font-inter"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => navigate('/admin/videos')}
                        className="text-muted-foreground hover:text-foreground transition-colors font-inter"
                      >
                        Vídeos
                      </button>
                      <button
                        onClick={() => navigate('/admin/taxonomia')}
                        className="text-muted-foreground hover:text-foreground transition-colors font-inter"
                      >
                        Categorias & Módulos
                      </button>
                      <button
                        onClick={() => navigate('/admin/users')}
                        className="text-muted-foreground hover:text-foreground transition-colors font-inter"
                      >
                        Usuários
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate('/meus-cursos')}
                        className="text-muted-foreground hover:text-foreground transition-colors font-inter"
                      >
                        Meus Cursos
                      </button>
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="text-muted-foreground hover:text-foreground transition-colors font-inter"
                      >
                        Todos os Vídeos
                      </button>
                      <button
                        onClick={() => navigate('/history')}
                        className="text-muted-foreground hover:text-foreground transition-colors font-inter"
                      >
                        Histórico
                      </button>
                    </>
                  )}
                </nav>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => setIsPwdOpen(true)}
                      className="text-foreground font-medium font-inter underline underline-offset-2 hover:text-primary"
                      title="Alterar senha"
                    >
                      {user.name}
                    </button>
                    {user.role === 'admin' && (
                      <span className="px-2 py-0.5 bg-gradient-primary text-primary-foreground text-xs rounded-full font-semibold">
                        Admin
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="flex items-center space-x-1"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-gradient-primary text-primary-foreground hover:shadow-glow transition-all duration-base"
                >
                  Entrar
                </Button>
              )}
            </div>
          </div>
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