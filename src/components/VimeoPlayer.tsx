import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, Maximize, SkipBack, SkipForward } from 'lucide-react';
import Player from '@vimeo/player';

interface VimeoPlayerProps {
  vimeoId?: string;
  vimeoEmbedUrl?: string;
  title: string;
  onProgress?: (progress: number, duration: number) => void;
  onComplete?: () => void;
  onPlay?: () => void;
  className?: string;
}

export default function VimeoPlayer({
  vimeoId,
  vimeoEmbedUrl,
  title,
  onProgress,
  onComplete,
  onPlay,
  className = ''
}: VimeoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (!containerRef.current || (!vimeoId && !vimeoEmbedUrl)) return;

    const videoId = vimeoId || vimeoEmbedUrl?.match(/video\/(\d+)/)?.[1];
    if (!videoId) return;

    // Criar iframe manualmente
    const iframe = document.createElement('iframe');
    iframe.src = `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0&app_id=58479`;
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
      onPlay?.();
    });

    player.on('pause', () => {
      setIsPlaying(false);
    });

    player.on('timeupdate', (data) => {
      setCurrentTime(data.seconds);
      const progressPercent = (data.seconds / data.duration) * 100;
      onProgress?.(progressPercent, data.duration);
    });

    player.on('loaded', () => {
      player.getDuration().then(d => {
        setDuration(d);
      });
    });

    player.on('ended', () => {
      setIsPlaying(false);
      onComplete?.();
    });

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [vimeoId, vimeoEmbedUrl, title, onProgress, onComplete, onPlay]);

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
      
      {/* Custom Controls Overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-3">
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
              className="text-white hover:bg-white/20"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={handleSkipBack}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
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
              className="w-20"
            />
            
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={handleFullscreen}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}