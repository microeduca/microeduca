import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Folder, ArrowUp, ArrowDown, Pencil, Trash2, Plus } from 'lucide-react';
import type { Module } from '@/types';

interface ModuleTreeProps {
  module: Module;
  allModules: Module[];
  level: number;
  editingId: string;
  editingTitle: string;
  onEdit: (module: Module) => void;
  onSaveEdit: (module: Module) => void;
  onCancelEdit: () => void;
  onTitleChange: (title: string) => void;
  onMove: (module: Module, direction: 'up' | 'down') => void;
  onAddChild: (parent: Module) => void;
  onDelete: (module: Module) => void;
  getSiblings: (module: Module) => Module[];
}

export function ModuleTree({
  module,
  allModules,
  level,
  editingId,
  editingTitle,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onTitleChange,
  onMove,
  onAddChild,
  onDelete,
  getSiblings,
}: ModuleTreeProps) {
  const children = allModules
    .filter(m => m.parentId === module.id)
    .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));

  const isEditing = editingId === module.id;
  const indentStyle = level > 0 ? { marginLeft: `${level * 1.5}rem` } : {};

  return (
    <div style={indentStyle} className={level > 0 ? 'mt-2' : ''}>
      <div className={`flex items-center justify-between ${level > 0 ? 'pl-2 border-l-2 border-gray-200' : 'border rounded p-3'}`}>
        <div className="flex items-center gap-2 flex-1">
          {level === 0 && <Folder className="h-4 w-4 text-muted-foreground" />}
          {level > 0 && <span className="text-muted-foreground">↳</span>}
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input 
                value={editingTitle} 
                onChange={(e) => onTitleChange(e.target.value)} 
                className="h-8 flex-1" 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveEdit(module);
                  if (e.key === 'Escape') onCancelEdit();
                }}
                autoFocus
              />
              <Button size="sm" onClick={() => onSaveEdit(module)}>Salvar</Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>Cancelar</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={level === 0 ? 'font-medium' : ''}>{module.title}</span>
              <Badge variant="outline" className="text-xs">ordem: {module.order}</Badge>
            </div>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => onMove(module, 'up')}
              disabled={getSiblings(module).findIndex(m => m.id === module.id) === 0}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => onMove(module, 'down')}
              disabled={getSiblings(module).findIndex(m => m.id === module.id) === getSiblings(module).length - 1}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onEdit(module)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onAddChild(module)} title="Adicionar submódulo">
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="text-destructive" 
              onClick={() => onDelete(module)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {children.length > 0 && (
        <div className="mt-2 space-y-1">
          {children.map(child => (
            <ModuleTree
              key={child.id}
              module={child}
              allModules={allModules}
              level={level + 1}
              editingId={editingId}
              editingTitle={editingTitle}
              onEdit={onEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onTitleChange={onTitleChange}
              onMove={onMove}
              onAddChild={onAddChild}
              onDelete={onDelete}
              getSiblings={getSiblings}
            />
          ))}
        </div>
      )}
    </div>
  );
}

