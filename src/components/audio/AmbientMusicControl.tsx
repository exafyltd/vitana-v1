import { Music2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAmbientMusic } from '@/context/AmbientMusicContext';
import { useSidebar } from '@/components/ui/sidebar';

export function AmbientMusicControl() {
  const { isPlaying, volume, isMuted, toggle, setVolume, toggleMute } = useAmbientMusic();
  const { open } = useSidebar();

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  // Collapsed sidebar - icon only
  if (!open) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-10 w-10 rounded-full hover:bg-accent/10 transition-all duration-200"
          >
            <div className="relative">
              <Music2 className={`h-5 w-5 transition-colors ${isPlaying ? 'text-accent' : 'text-muted-foreground'}`} />
              {isPlaying && (
                <div className="absolute -inset-1 rounded-full bg-accent/20 animate-pulse" style={{ animationDuration: '2s' }} />
              )}
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Ambient Music {isPlaying ? '(playing)' : '(paused)'}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expanded sidebar - full control
  return (
    <div className="w-full px-2">
      <div className="flex items-center gap-2 rounded-lg hover:bg-accent/10 transition-colors p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-8 w-8 rounded-full shrink-0"
        >
          <Music2 className={`h-4 w-4 transition-colors ${isPlaying ? 'text-accent' : 'text-muted-foreground'}`} />
        </Button>
        
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-foreground">Ambient Music</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {isMuted ? (
                  <VolumeX className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" className="w-48 p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Volume</span>
                  <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
                </div>
                <Slider
                  value={[volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMute}
                  className="w-full"
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {isPlaying && (
          <div className="flex gap-0.5">
            <div className="w-0.5 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-0.5 h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-0.5 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}
