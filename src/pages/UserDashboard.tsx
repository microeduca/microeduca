import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock, CheckCircle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { mockCategories, mockVideos } from '@/lib/mockData';
import { useNavigate } from 'react-router-dom';

export default function UserDashboard() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  
  // Filtrar categorias e vídeos baseado nas categorias atribuídas ao usuário
  const userCategories = mockCategories.filter(cat => 
    user?.assignedCategories?.includes(cat.id)
  );
  
  const userVideos = mockVideos.filter(video => 
    user?.assignedCategories?.includes(video.categoryId)
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-poppins font-bold mb-2">Meus Cursos</h1>
        <p className="text-muted-foreground mb-8">
          Bem-vindo de volta, {user?.name}! Continue de onde parou.
        </p>
        
        {userCategories.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">
                Você ainda não tem acesso a nenhuma categoria de cursos.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Entre em contato com o administrador para solicitar acesso.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {userCategories.map(category => {
              const categoryVideos = userVideos.filter(v => v.categoryId === category.id);
              
              return (
                <div key={category.id}>
                  <h2 className="text-xl font-poppins font-semibold mb-4">
                    {category.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryVideos.map(video => (
                      <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="aspect-video relative">
                          <img 
                            src={video.thumbnail} 
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <Button 
                            size="icon" 
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary/90 hover:bg-primary"
                          >
                            <Play className="h-6 w-6" />
                          </Button>
                        </div>
                        <CardHeader>
                          <CardTitle className="text-lg">{video.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {video.description}
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {Math.floor(video.duration / 60)} min
                            </span>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}