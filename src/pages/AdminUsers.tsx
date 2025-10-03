import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Users, UserCheck, Shield, Edit2, Trash2, MoreVertical, UserX, Mail, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUsers, addUser, updateUser, deleteUser, getCategories } from '@/lib/storage';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/auth';

export default function AdminUsers() {
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const [u, c] = await Promise.all([getUsers(), getCategories()]);
      setUsers(u);
      setCategories(c);
    })();
  }, []);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user' | 'cliente',
    assignedCategories: [] as string[],
  });

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Erro ao adicionar usuário",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const user: User = {
      id: Date.now().toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      assignedCategories: newUser.assignedCategories,
      createdAt: new Date(),
      isActive: true,
    };

    await addUser(user, newUser.password);
    setUsers(await getUsers());
    setIsAddDialogOpen(false);
    setNewUser({
      name: '',
      email: '',
      password: '',
      role: 'user',
      assignedCategories: [],
    });

    toast({
      title: "Usuário adicionado",
      description: "O usuário foi criado com sucesso.",
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    await updateUser(editingUser);
    setUsers(await getUsers());
    setIsEditDialogOpen(false);
    setEditingUser(null);

    toast({
      title: "Usuário atualizado",
      description: "As informações do usuário foram atualizadas.",
    });
  };

  const handleDeleteUser = async (userId: string) => {
    // Prevent deleting current user
    if (userId === currentUser?.id) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode excluir seu próprio usuário.",
        variant: "destructive",
      });
      return;
    }

    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      await deleteUser(userId);
      setUsers(await getUsers());
      
      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido do sistema.",
      });
    }
  };

  const activeUsers = users.filter(u => u.role === 'user').length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const recentUsers = users.filter(u => {
    const userDate = new Date(u.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return userDate > weekAgo;
  }).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-poppins font-bold">Gerenciar Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie os usuários e suas permissões de acesso
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">usuários cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUsers}</div>
              <p className="text-xs text-muted-foreground">perfil padrão</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminUsers}</div>
              <p className="text-xs text-muted-foreground">com acesso total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Novos (7 dias)</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentUsers}</div>
              <p className="text-xs text-muted-foreground">cadastros recentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              Todos os usuários cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Categorias</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.name}
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">
                            Você
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge className="bg-gradient-primary text-primary-foreground">
                          Administrador
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Usuário
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.assignedCategories && user.assignedCategories.length > 0 ? (
                          user.assignedCategories.slice(0, 2).map(catId => {
                            const category = categories.find(c => c.id === catId);
                            return category ? (
                              <Badge key={catId} variant="outline" className="text-xs">
                                <FolderOpen className="h-3 w-3 mr-1" />
                                {category.name}
                              </Badge>
                            ) : null;
                          })
                        ) : (
                          <span className="text-xs text-muted-foreground">Nenhuma</span>
                        )}
                        {user.assignedCategories && user.assignedCategories.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.assignedCategories.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingUser(user);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-destructive"
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário cadastrado ainda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add User Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              <DialogDescription>
                Crie uma nova conta de usuário no sistema
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Senha segura"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Perfil</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: 'admin' | 'user' | 'cliente') => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Categorias de Acesso</Label>
                <div className="text-sm text-muted-foreground mb-2">
                  Selecione as categorias que o usuário terá acesso
                </div>
                <ScrollArea className="h-[200px] w-full border rounded-md p-4">
                  <div className="space-y-3">
                    {categories.map(category => (
                      <div key={category.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`new-cat-${category.id}`}
                          checked={newUser.assignedCategories.includes(category.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewUser({
                                ...newUser,
                                assignedCategories: [...newUser.assignedCategories, category.id]
                              });
                            } else {
                              setNewUser({
                                ...newUser,
                                assignedCategories: newUser.assignedCategories.filter(id => id !== category.id)
                              });
                            }
                          }}
                        />
                        <div className="grid gap-1 leading-none">
                          <label
                            htmlFor={`new-cat-${category.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {category.name}
                          </label>
                          {category.description && (
                            <p className="text-xs text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {categories.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma categoria cadastrada
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddUser}>Adicionar Usuário</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize as informações do usuário
              </DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Nome</Label>
                  <Input
                    id="edit-name"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">E-mail</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-password">Nova Senha (opcional)</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    placeholder="Deixe em branco para manter a atual"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Perfil</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value: 'admin' | 'user' | 'cliente') => setEditingUser({ ...editingUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Categorias de Acesso</Label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Selecione as categorias que o usuário terá acesso
                  </div>
                  <ScrollArea className="h-[200px] w-full border rounded-md p-4">
                    <div className="space-y-3">
                      {categories.map(category => (
                        <div key={category.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={`edit-cat-${category.id}`}
                            checked={editingUser.assignedCategories?.includes(category.id) || false}
                            onCheckedChange={(checked) => {
                              const currentCategories = editingUser.assignedCategories || [];
                              if (checked) {
                                setEditingUser({
                                  ...editingUser,
                                  assignedCategories: [...currentCategories, category.id]
                                });
                              } else {
                                setEditingUser({
                                  ...editingUser,
                                  assignedCategories: currentCategories.filter(id => id !== category.id)
                                });
                              }
                            }}
                          />
                          <div className="grid gap-1 leading-none">
                            <label
                              htmlFor={`edit-cat-${category.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {category.name}
                            </label>
                            {category.description && (
                              <p className="text-xs text-muted-foreground">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {categories.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma categoria cadastrada
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateUser}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}