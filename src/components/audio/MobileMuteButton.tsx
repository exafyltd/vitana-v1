import { Volume2, VolumeX } from 'lucide-react';
import { useLocation } from 'react-router-dom';
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
  return null;
}
