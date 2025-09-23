import { ReactNode } from 'react';
import { Button } from './ui/button';
import { getCurrentUser, logout } from '@/lib/auth';
import { LogOut, User, BookOpen, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const user = getCurrentUser();
  const navigate = useNavigate();

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
                  EduStream
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
                        onClick={() => navigate('/admin/categorias')}
                        className="text-muted-foreground hover:text-foreground transition-colors font-inter"
                      >
                        Categorias
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
                        onClick={() => navigate('/dashboard')}
                        className="text-muted-foreground hover:text-foreground transition-colors font-inter"
                      >
                        Meus Cursos
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
                    <span className="text-foreground font-medium font-inter">{user.name}</span>
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
                  className="bg-gradient-primary hover:shadow-glow transition-all duration-base"
                >
                  Entrar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-secondary/50 border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground font-inter">
            © 2024 EduStream. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}