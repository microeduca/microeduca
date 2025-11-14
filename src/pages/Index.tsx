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
              A Plataforma de Capacitação Profissional da Micro – Centro Diagnóstico: feita para desenvolver nossa Equipe e encantar nossos Clientes.
            </p>
            <p className="text-lg opacity-90">
              Aprendizado, inovação e conexão em um só lugar — afinal nosso propósito é buscar e evoluir com o conhecimento!
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-poppins font-bold text-center mb-12">
          O que você encontra na plataforma?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-accent/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="h-10 w-10 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Material de Treinamento</h3>
            <p className="text-muted-foreground">
              Conteúdo em vídeo e PDF para diversas áreas de atuação.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Acesso Personalizado</h3>
            <p className="text-muted-foreground">
              Cada usuário acessa conteúdos específicos de acordo com seu perfil.
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-secondary/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Acompanhamento</h3>
            <p className="text-muted-foreground">
              Histórico de uso e progresso nos treinamentos
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-secondary/20 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-poppins font-bold mb-4">
            Pronto para evoluir com a gente?
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
