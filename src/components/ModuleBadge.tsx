import { Badge } from '@/components/ui/badge';

interface ModuleBadgeProps {
  moduleId?: string | null;
  categoryId?: string | null;
  modulesByCategory: Record<string, Array<{ id: string; title: string }>>;
  className?: string;
}

export default function ModuleBadge({ moduleId, categoryId, modulesByCategory, className }: ModuleBadgeProps) {
  if (!moduleId || !categoryId) return null;
  const list = modulesByCategory[categoryId] || [];
  const mod = list.find(m => m.id === moduleId);
  if (!mod) return null;
  return (
    <Badge variant="outline" className={className || 'text-[10px] w-fit'}>
      {mod.title}
    </Badge>
  );
}


