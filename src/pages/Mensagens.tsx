import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import Conversa from '@/components/Conversa';

export default function Mensagens() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-poppins font-bold">Mensagens</h1>
          <p className="text-muted-foreground">Fale diretamente com a administração do portal</p>
        </div>

        <Card className="max-w-3xl h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5" />
              Sua conversa
            </CardTitle>
            <CardDescription>
              Somente você e a administração enxergam estas mensagens
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col">
            <Conversa />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
