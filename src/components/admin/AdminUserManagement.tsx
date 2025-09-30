import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { User, Category } from '@/types';
import { getUsers, getCategories, addUser, updateUser } from '@/lib/storage';
import { Plus, Edit, UserCheck, UserX, Users } from 'lucide-react';

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'user',
    assignedCategories: [],
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    (async () => {
      const [u, c] = await Promise.all([getUsers(), getCategories()]);
      setUsers(u);
      setCategories(c);
    })();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !selectedCategory) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    const user: User = {
      id: `user-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: 'user',
      assignedCategories: [selectedCategory],
      createdAt: new Date(),
      isActive: true,
    };

    await addUser(user);
    setUsers(await getUsers());
    setNewUser({
      name: '',
      email: '',
      role: 'user',
      assignedCategories: [],
    });
    setSelectedCategory('');
    setIsAddDialogOpen(false);
    
    toast({
      title: 'Sucesso',
      description: 'Usuário adicionado com sucesso!',
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    await updateUser(editingUser);
    setUsers(await getUsers());
    setIsEditDialogOpen(false);
    setEditingUser(null);
    
    toast({
      title: 'Sucesso',
      description: 'Usuário atualizado com sucesso!',
    });
  };

  const toggleUserStatus = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const updatedUser = { ...user, isActive: !user.isActive };
      updateUser(updatedUser);
      setUsers(getUsers());
      
      toast({
        title: 'Sucesso',
        description: `Usuário ${updatedUser.isActive ? 'ativado' : 'desativado'} com sucesso!`,
      });
    }
  };

  const getCategoryName = (categoryIds: string[]) => {
    if (categoryIds.length === 0) return 'Sem categoria';
    const category = categories.find(c => c.id === categoryIds[0]);
    return category?.name || 'Sem categoria';
  };

  const getUsersByCategory = () => {
    const categoryMap = new Map<string, User[]>();
    
    // Initialize map with all categories
    categories.forEach(cat => {
      categoryMap.set(cat.name, []);
    });
    categoryMap.set('Sem categoria', []);
    
    // Group users by category
    users.forEach(user => {
      if (user.role === 'admin') return; // Skip admin users
      
      const categoryName = getCategoryName(user.assignedCategories);
      const categoryUsers = categoryMap.get(categoryName) || [];
      categoryUsers.push(user);
      categoryMap.set(categoryName, categoryUsers);
    });
    
    return categoryMap;
  };

  const usersByCategory = getUsersByCategory();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>
                Adicione e gerencie os colaboradores e suas permissões
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:shadow-glow">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Cadastre um novo colaborador na plataforma
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="joao@micro.com.br"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      O usuário terá acesso apenas aos vídeos desta categoria
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddUser} className="bg-gradient-primary">
                      Adicionar Usuário
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users
                .filter(user => user.role !== 'admin')
                .map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getCategoryName(user.assignedCategories)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive !== false ? 'default' : 'secondary'}>
                        {user.isActive !== false ? (
                          <><UserCheck className="h-3 w-3 mr-1" /> Ativo</>
                        ) : (
                          <><UserX className="h-3 w-3 mr-1" /> Inativo</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingUser(user);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Usuário</DialogTitle>
                              <DialogDescription>
                                Atualize as informações do colaborador
                              </DialogDescription>
                            </DialogHeader>
                            {editingUser && (
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit-name">Nome Completo</Label>
                                  <Input
                                    id="edit-name"
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-email">Email</Label>
                                  <Input
                                    id="edit-email"
                                    type="email"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-category">Categoria</Label>
                                  <Select
                                    value={editingUser.assignedCategories[0] || ''}
                                    onValueChange={(value) => setEditingUser({ ...editingUser, assignedCategories: [value] })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          {category.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    Cancelar
                                  </Button>
                                  <Button onClick={handleUpdateUser} className="bg-gradient-primary">
                                    Salvar Alterações
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Switch
                          checked={user.isActive !== false}
                          onCheckedChange={() => toggleUserStatus(user.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários por Categoria
          </CardTitle>
          <CardDescription>
            Visualize a distribuição de colaboradores por categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(usersByCategory.entries()).map(([category, categoryUsers]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">{category}</h4>
                    <Badge variant="outline">{categoryUsers.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categoryUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum usuário</p>
                    ) : (
                      categoryUsers.slice(0, 3).map(user => (
                        <div key={user.id} className="text-sm">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-muted-foreground">{user.email}</p>
                        </div>
                      ))
                    )}
                    {categoryUsers.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        +{categoryUsers.length - 3} mais
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}