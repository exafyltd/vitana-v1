import { useEffect, useRef, useCallback } from 'react';

/**
 * Global Media Precedence Manager
 * 
 * This hook sets up document-level capturing listeners for all play/pause/ended events
 * on video and audio elements. When any foreground media plays (that is NOT the Soundscape 
 * audio element), it triggers the provided callbacks to pause/resume background music.
 * 
 * This ensures Soundscape immediately yields to:
 * - Video shorts feed
 * - Any <video> on the site
 * - Any <audio> on the site  
 * - Custom audio players
 */

interface UseGlobalMediaPrecedenceOptions {
  /** The Soundscape audio element to exclude from detection */
  soundscapeAudioRef: React.RefObject<HTMLAudioElement | null>;
  /** Called when any foreground media starts playing */
  onForegroundMediaStart: () => void;
  /** Called when all foreground media stops */
  onForegroundMediaStop: () => void;
  /** Whether the hook is enabled */
  enabled?: boolean;
}

export function useGlobalMediaPrecedence({
  soundscapeAudioRef,
  onForegroundMediaStart,
  onForegroundMediaStop,
  enabled = true,
}: UseGlobalMediaPrecedenceOptions) {
  // Track all currently active foreground media elements
  const activeForegroundMediaRef = useRef<Set<HTMLMediaElement>>(new Set());
  
  // Stable callback refs
  const onStartRef = useRef(onForegroundMediaStart);
  const onStopRef = useRef(onForegroundMediaStop);
  
  // Keep refs updated
  useEffect(() => {
    onStartRef.current = onForegroundMediaStart;
    onStopRef.current = onForegroundMediaStop;
  }, [onForegroundMediaStart, onForegroundMediaStop]);

  const isSoundscapeElement = useCallback((element: HTMLMediaElement): boolean => {
    // Check if it's our soundscape element
    if (soundscapeAudioRef.current && element === soundscapeAudioRef.current) {
      return true;
    }
    // Also check window singleton
    if (window.__SOUNDSCAPE_AUDIO__ && element === window.__SOUNDSCAPE_AUDIO__) {
      return true;
    }
    // Check if it's the ambient track by src
    if (element.src?.includes('maxina-ambient-music')) {
      return true;
    }
    return false;
  }, [soundscapeAudioRef]);


  useEffect(() => {
    if (!enabled) return;

    const handlePlay = (event: Event) => {
      const target = event.target as HTMLMediaElement;
      
      // Only handle video and audio elements
      if (!(target instanceof HTMLVideoElement || target instanceof HTMLAudioElement)) {
        return;
      }

      // Skip soundscape audio element
      if (isSoundscapeElement(target)) {
        return;
      }

      // Skip muted videos (they don't need audio precedence)
      if (target instanceof HTMLVideoElement && target.muted) {
        console.log('[GlobalMediaPrecedence] Skipping muted video');
        return;
      }

      console.log('[GlobalMediaPrecedence] Foreground media started:', target.tagName, target.src?.substring(0, 60));
      
      const hadNoActiveMedia = activeForegroundMediaRef.current.size === 0;
      activeForegroundMediaRef.current.add(target);
      
      // Trigger soundscape pause on first foreground media
      if (hadNoActiveMedia) {
        onStartRef.current();
      }
    };

    const handlePauseOrEnd = (event: Event) => {
      const target = event.target as HTMLMediaElement;
      
      // Only handle video and audio elements
      if (!(target instanceof HTMLVideoElement || target instanceof HTMLAudioElement)) {
        return;
      }

      // Skip soundscape audio element
      if (isSoundscapeElement(target)) {
        return;
      }

      console.log('[GlobalMediaPrecedence] Foreground media stopped:', target.tagName, event.type);
      
      activeForegroundMediaRef.current.delete(target);
      
      // Resume soundscape when no more foreground media
      if (activeForegroundMediaRef.current.size === 0) {
        onStopRef.current();
      }
    };

    // Handle volume/mute changes - video may unmute while playing
    const handleVolumeChange = (event: Event) => {
      const target = event.target as HTMLMediaElement;
      
      // Only handle video elements (audio elements are always foreground)
      if (!(target instanceof HTMLVideoElement)) {
        return;
      }

      // Skip soundscape audio element
      if (isSoundscapeElement(target)) {
        return;
      }

      // If video is playing and was just unmuted, add to active media
      if (!target.paused && !target.muted) {
        if (!activeForegroundMediaRef.current.has(target)) {
          console.log('[GlobalMediaPrecedence] Video unmuted while playing:', target.src?.substring(0, 60));
          const hadNoActiveMedia = activeForegroundMediaRef.current.size === 0;
          activeForegroundMediaRef.current.add(target);
          if (hadNoActiveMedia) {
            onStartRef.current();
          }
        }
      }
      
      // If video was muted, remove from active media
      if (target.muted && activeForegroundMediaRef.current.has(target)) {
        console.log('[GlobalMediaPrecedence] Video muted while playing:', target.src?.substring(0, 60));
        activeForegroundMediaRef.current.delete(target);
        if (activeForegroundMediaRef.current.size === 0) {
          onStopRef.current();
        }
      }
    };

    // Use capturing phase to catch events before they're handled
    document.addEventListener('play', handlePlay, true);
    document.addEventListener('pause', handlePauseOrEnd, true);
    document.addEventListener('ended', handlePauseOrEnd, true);
    document.addEventListener('volumechange', handleVolumeChange, true);

    console.log('[GlobalMediaPrecedence] Listeners attached');

    return () => {
      document.removeEventListener('play', handlePlay, true);
      document.removeEventListener('pause', handlePauseOrEnd, true);
      document.removeEventListener('ended', handlePauseOrEnd, true);
      document.removeEventListener('volumechange', handleVolumeChange, true);
      activeForegroundMediaRef.current.clear();
      console.log('[GlobalMediaPrecedence] Listeners removed');
    };
  }, [enabled, isSoundscapeElement]);

  // Expose method to check if any foreground media is active
  const hasActiveForegroundMedia = useCallback(() => {
    return activeForegroundMediaRef.current.size > 0;
  }, []);

  return { hasActiveForegroundMedia };
}
