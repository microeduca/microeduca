import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, Maximize, SkipBack, SkipForward } from 'lucide-react';
import Player from '@vimeo/player';

interface VimeoPlayerProps {
  vimeoId?: string;
  vimeoEmbedUrl?: string;
  title: string;
  onProgress?: (progress: number, duration: number, seconds: number) => void;
  onComplete?: () => void;
  onPlay?: () => void;
  startAtSeconds?: number; // novo: posição inicial
  className?: string;
  withOverlay?: boolean; // opcional: mostrar controles customizados (desligado por padrão)
}

export default function VimeoPlayer({
  vimeoId,
  vimeoEmbedUrl,
  title,
  onProgress,
  onComplete,
  onPlay,
  startAtSeconds,
  className = '',
  withOverlay = false
}: VimeoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const onProgressRef = useRef<typeof onProgress>();
  const onCompleteRef = useRef<typeof onComplete>();
  const onPlayRef = useRef<typeof onPlay>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);

  // Keep latest callbacks in refs to avoid re-creating the player
  useEffect(() => {
    onProgressRef.current = onProgress;
    onCompleteRef.current = onComplete;
    onPlayRef.current = onPlay;
  }, [onProgress, onComplete, onPlay]);

  useEffect(() => {
    if (!containerRef.current || (!vimeoId && !vimeoEmbedUrl)) return;

    const videoId = vimeoId || vimeoEmbedUrl?.match(/video\/(\d+)/)?.[1];
    if (!videoId && !vimeoEmbedUrl) return;

    // Montar URL de embed priorizando a URL fornecida pelo Vimeo (contém h= para unlisted)
    const baseUrl = vimeoEmbedUrl || `https://player.vimeo.com/video/${videoId}`;
    const url = new URL(baseUrl);
    url.searchParams.set('badge', '0');
    url.searchParams.set('autopause', '0');
    url.searchParams.set('app_id', '58479');
    // manter quaisquer outros params existentes como h=

    // Criar iframe manualmente
    const iframe = document.createElement('iframe');
    iframe.src = url.toString();
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture; clipboard-write';
    iframe.title = title;
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(iframe);

    // Configurar listeners do Vimeo Player
    const player = new Player(iframe);
    playerRef.current = player;

    player.on('play', () => {
      setIsPlaying(true);
      onPlayRef.current?.();
    });

    player.on('pause', () => {
      setIsPlaying(false);
    });

    player.on('timeupdate', (data) => {
      setCurrentTime(data.seconds);
      const progressPercent = (data.seconds / data.duration) * 100;
      onProgressRef.current?.(progressPercent, data.duration, data.seconds);
    });

    player.on('loaded', async () => {
      const d = await player.getDuration();
      setDuration(d);
      // Buscar retomar posição se fornecida
      if (typeof startAtSeconds === 'number' && startAtSeconds > 0) {
        try {
          await player.setCurrentTime(Math.min(d - 1, Math.max(0, startAtSeconds)));
        } catch {}
      }
    });

    player.on('ended', () => {
      setIsPlaying(false);
      onCompleteRef.current?.();
    });

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [vimeoId, vimeoEmbedUrl, title]);

  const handlePlayPause = async () => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      await playerRef.current.pause();
    } else {
      await playerRef.current.play();
    }
  };

  const handleSkipBack = async () => {
    if (!playerRef.current) return;
    const time = await playerRef.current.getCurrentTime();
    await playerRef.current.setCurrentTime(Math.max(0, time - 10));
  };

  const handleSkipForward = async () => {
    if (!playerRef.current) return;
    const time = await playerRef.current.getCurrentTime();
    await playerRef.current.setCurrentTime(Math.min(duration, time + 10));
  };

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      await playerRef.current.setVolume(newVolume);
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    const iframe = containerRef.current.querySelector('iframe');
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`relative bg-black ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div 
        ref={containerRef} 
        className="relative w-full h-full"
        style={{ paddingBottom: '56.25%' }}
      />
      
      {/* Custom Controls Overlay (desligado por padrão para evitar conflito com os controles nativos do Vimeo) */}
      {withOverlay && (
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 pointer-events-none ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress Bar */}
          <div className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-3 pointer-events-auto">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 pointer-events-auto"
                onClick={handlePlayPause}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 pointer-events-auto"
                onClick={handleSkipBack}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 pointer-events-auto"
                onClick={handleSkipForward}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-white" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 pointer-events-auto"
              />
              
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 pointer-events-auto"
                onClick={handleFullscreen}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}