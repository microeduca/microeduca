import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, PlayCircle, Users, Award } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    // Se já estiver logado, redireciona para o dashboard apropriado
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-5xl font-poppins font-bold mb-6">
              Micro - Centro Diagnóstico
            </h1>
            <p className="text-xl mb-8 opacity-95">
              Plataforma de Treinamento e Capacitação Profissional 
              para nossos colaboradores
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate('/login')}
                className="bg-background text-primary hover:bg-secondary"
              >
                Começar Agora
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/login')}
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                Fazer Login
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-poppins font-bold text-center mb-12">
          Recursos da Plataforma
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-accent/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="h-10 w-10 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Material de Treinamento</h3>
            <p className="text-muted-foreground">
              Vídeos e materiais específicos para cada área de atuação
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Acesso Personalizado</h3>
            <p className="text-muted-foreground">
              Cada colaborador acessa apenas o conteúdo de sua área
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-secondary/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Acompanhamento</h3>
            <p className="text-muted-foreground">
              Histórico completo e tracking de progresso em cada vídeo
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-secondary/20 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-poppins font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Acesse o portal de treinamento exclusivo para colaboradores
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/login')}
            className="bg-gradient-primary hover:shadow-glow"
          >
            Acessar Portal
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
