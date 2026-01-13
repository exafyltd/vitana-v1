import { Volume2, VolumeX } from 'lucide-react';
import { useSoundscape } from '@/context/SoundscapeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

/**
 * Global mobile mute button for background music (Soundscape)
 * - Fixed position top-right on mobile only
 * - Persists mute state via SoundscapeContext (localStorage)
 * - Glass-morphism styling matching VITANA premium aesthetic
 */
export function MobileMuteButton() {
  const isMobile = useIsMobile();
  
  // Try to get soundscape context - may not be available during initial render
  let soundscapeContext: ReturnType<typeof useSoundscape> | null = null;
  try {
    soundscapeContext = useSoundscape();
  } catch {
    // Context not available yet - render nothing
  }

  // Only show on mobile and when soundscape context is available
  if (!isMobile || !soundscapeContext) return null;
  
  const { isMuted, toggleMute, isPlaying } = soundscapeContext;

  return (
    <button
      onClick={toggleMute}
      aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
      className={cn(
        // Fixed positioning - top right, below status bar
        "fixed top-4 right-4 z-[9999]",
        // Minimum 44px tap target for accessibility
        "min-h-[44px] min-w-[44px] h-11 w-11",
        // Glass morphism styling
        "flex items-center justify-center rounded-full",
        "backdrop-blur-md bg-background/60 border border-border/50",
        "shadow-lg shadow-black/10",
        // Hover/active states
        "active:scale-95 transition-all duration-200",
        // Premium glow when unmuted and playing
        !isMuted && isPlaying && "ring-2 ring-accent/30"
      )}
    >
      {isMuted ? (
        <VolumeX className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Volume2 className={cn(
          "h-5 w-5 transition-colors",
          isPlaying ? "text-accent" : "text-muted-foreground"
        )} />
      )}
    </button>
  );
}
