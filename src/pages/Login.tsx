import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { login } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const user = await login(email, password).finally(() => setSubmitting(false));

    if (user) {
      toast({
        title: 'Login realizado com sucesso!',
        description: `Bem-vindo(a) de volta, ${user.name}!`,
      });
      
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'cliente') {
        navigate('/cliente');
      } else {
        navigate('/dashboard');
      }
    } else {
      toast({
        title: 'Erro no login',
        description: 'Email ou senha inválidos',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <img src="/micro-simbolo.png" alt="Micro — Centro Diagnóstico" className="h-14 w-auto" />
          </div>
          <CardTitle className="font-marca text-2xl">Portal de Treinamento – MicroEduca</CardTitle>
          <p className="text-sm font-medium text-muted-foreground">Versão 2A</p>
          <CardDescription>
            Área exclusiva para Equipe e Cliente Micro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary hover:shadow-glow transition-all">
              {submitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}