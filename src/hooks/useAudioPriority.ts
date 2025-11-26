import { useEffect } from 'react';
import { useSoundscape } from '@/context/SoundscapeContext';
import { useStreamingState } from '@/context/StreamingStateContext';
import { globalState as audioPlayerGlobalState } from '@/hooks/useAudioPlayer';

/**
 * Central Audio Priority Manager
 * Automatically pauses Soundscape when priority audio is active:
 * - Media player (music/podcasts/videos)
 * - VITANA Orb (audio overlay or glass mode)
 * 
 * Note: Call monitoring is handled separately in authenticated contexts
 * where CallProvider is available.
 */
export function useAudioPriority() {
  const { pauseForPriorityAudio, resumeAfterPriorityAudio } = useSoundscape();
  const { audioOverlayVisible, glassModeActive } = useStreamingState();

  useEffect(() => {
    // Check all priority audio sources
    const mediaPlayerActive = audioPlayerGlobalState.isPlaying;
    const vitanaOrbActive = audioOverlayVisible || glassModeActive;

    const hasPriorityAudio = mediaPlayerActive || vitanaOrbActive;

    if (hasPriorityAudio) {
      pauseForPriorityAudio();
    } else {
      resumeAfterPriorityAudio();
    }
  }, [
    audioPlayerGlobalState.isPlaying,
    audioOverlayVisible,
    glassModeActive,
    pauseForPriorityAudio,
    resumeAfterPriorityAudio,
  ]);
}
