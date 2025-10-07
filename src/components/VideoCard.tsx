import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, Play, Star } from 'lucide-react';
import ModuleBadge from '@/components/ModuleBadge';

interface VideoCardProps {
  video: any;
  progressPercentage?: number;
  showProgressBar?: boolean;
  modulesByCategory: Record<string, any[]>;
  categories: any[];
  onClick?: (videoId: string) => void;
  layout?: 'grid' | 'list';
  isFavorite?: boolean;
  onToggleFavorite?: (videoId: string) => void;
  isNew?: boolean;
  onResume?: (videoId: string) => void;
}

export default function VideoCard({ video, progressPercentage = 0, showProgressBar = true, modulesByCategory, categories, onClick, layout = 'grid', isFavorite, onToggleFavorite, isNew, onResume }: VideoCardProps) {
  const categoryId = (video as any).categoryId || (video as any).category_id;
  const moduleId = (video as any).moduleId || (video as any).module_id;
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes} min`;
  };

  if (layout === 'list') {
    return (
      <Card 
        className="hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => onClick?.(video.id)}
      >
        <CardContent className="p-4 flex gap-4">
          <div className="aspect-video w-48 relative flex-shrink-0">
            {video.thumbnail ? (
              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover rounded-md" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center rounded-md">
                <Play className="h-8 w-8 text-primary/50" />
              </div>
            )}
            {progressPercentage >= 100 && (
              <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                <CheckCircle className="h-4 w-4" />
              </div>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(video.id); }}
              className={`absolute top-2 left-2 p-1 rounded-full ${isFavorite ? 'text-yellow-400' : 'text-white/70'}`}
              aria-label="Favoritar"
              title="Favoritar"
            >
              <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{video.title}</h3>
                {isNew && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Novo</span>}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(video.duration)}
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs">
                  {categories.find(c => c.id === categoryId)?.name}
                </span>
                <ModuleBadge moduleId={moduleId} categoryId={categoryId} modulesByCategory={modulesByCategory} className="text-[10px]" />
              </div>
            </div>
            {showProgressBar && progressPercentage > 0 && progressPercentage < 100 && (
              <div className="space-y-1">
                <div className="h-1 bg-secondary rounded">
                  <div className="h-1 bg-primary rounded" style={{ width: `${progressPercentage}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{Math.round(progressPercentage)}% concluído</p>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onResume?.(video.id); }}>Retomar</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick?.(video.id)}
    >
      <div className="aspect-video relative">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Play className="h-12 w-12 text-primary/50" />
          </div>
        )}
        {progressPercentage >= 100 && (
          <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
            <CheckCircle className="h-4 w-4" />
          </div>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(video.id); }}
          className={`absolute top-2 left-2 p-2 rounded-full ${isFavorite ? 'text-yellow-400' : 'text-white/80'}`}
          aria-label="Favoritar"
          title="Favoritar"
        >
          <Star className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
        <Button 
          size="icon" 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary/90 hover:bg-primary opacity-100"
          onClick={(e) => { e.stopPropagation(); onClick?.(video.id); }}
        >
          <Play className="h-5 w-5" />
        </Button>
        {showProgressBar && progressPercentage > 0 && progressPercentage < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div className="h-full bg-primary" style={{ width: `${progressPercentage}%` }} />
          </div>
        )}
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base line-clamp-1">{video.title}</CardTitle>
          {isNew && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">Novo</span>}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{video.description}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(video.duration)}
          </span>
          <div className="flex gap-1 flex-wrap justify-end">
            {(((video as any).category_ids) || [categoryId]).filter(Boolean).slice(0,2).map((cid: string) => (
              <span key={cid} className="text-xs">
                {categories.find(c => c.id === cid)?.name || 'Sem categoria'}
              </span>
            ))}
            {((video as any).category_ids?.length || 0) > 2 && (
              <span className="text-[10px]">+{(video as any).category_ids.length - 2}</span>
            )}
            <ModuleBadge moduleId={moduleId} categoryId={categoryId} modulesByCategory={modulesByCategory} className="text-[10px]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


