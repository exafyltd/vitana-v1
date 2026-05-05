import { Music2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from '@/components/ui/responsive-popover';
import { useSoundscape } from '@/context/SoundscapeContext';
import { useSidebar } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { t } from '@/lib/i18n-toast';

export function SoundscapeControl() {
  const { isPlaying, volume, isMuted, toggle, setVolume, toggleMute } = useSoundscape();
  const { open } = useSidebar();

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const handleToggleMute = () => {
    toggleMute();
    toast.success(isMuted ? 'Soundscape unmuted' : 'Soundscape muted', {
      duration: 1500
    });
  };

  const handleTogglePlay = () => {
    toggle();
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
        <TooltipContent side="right">{t('screens.audio.soundscapeValue0', { value0: isPlaying ? '(playing)' : '(paused)' })}</TooltipContent>
      </Tooltip>
    );
  }

  // Expanded sidebar - full control
  return (
    <div className="w-full px-2">
      <div className="flex items-center gap-2 rounded-lg bg-accent/10 hover:bg-accent/15 transition-colors p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleTogglePlay}
          className="h-8 w-8 rounded-full shrink-0"
        >
          <Music2 className={`h-4 w-4 transition-colors ${isPlaying ? 'text-accent' : 'text-muted-foreground'}`} />
        </Button>
        
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-foreground">{t('screens.audio.soundscape')}</span>
          
          <ResponsivePopover>
            <ResponsivePopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto min-h-[44px] min-w-[44px]"
                onClick={(e) => e.stopPropagation()}
              >
                {isMuted ? (
                  <VolumeX className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
            </ResponsivePopoverTrigger>
            <ResponsivePopoverContent title={t('screens.audio.volume')} side="right" className="w-48 p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{t('screens.audio.volume')}</span>
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
                  onClick={handleToggleMute}
                  className="w-full min-h-[44px]"
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
              </div>
            </ResponsivePopoverContent>
          </ResponsivePopover>
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
