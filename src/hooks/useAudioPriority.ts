import { useEffect, useState } from 'react';
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
  
  // Subscribe to audio player state changes
  const [mediaPlayerActive, setMediaPlayerActive] = useState(audioPlayerGlobalState.isPlaying);

  useEffect(() => {
    // Subscribe to the audio player's listener system
    const listener = () => {
      setMediaPlayerActive(audioPlayerGlobalState.isPlaying);
    };
    
    audioPlayerGlobalState.listeners.add(listener);
    
    // Set initial state
    setMediaPlayerActive(audioPlayerGlobalState.isPlaying);
    
    return () => {
      audioPlayerGlobalState.listeners.delete(listener);
    };
  }, []);

  // Handle priority audio changes
  useEffect(() => {
    const vitanaOrbActive = audioOverlayVisible || glassModeActive;
    const hasPriorityAudio = mediaPlayerActive || vitanaOrbActive;

    if (hasPriorityAudio) {
      pauseForPriorityAudio();
    } else {
      resumeAfterPriorityAudio();
    }
  }, [
    mediaPlayerActive,
    audioOverlayVisible,
    glassModeActive,
    pauseForPriorityAudio,
    resumeAfterPriorityAudio,
  ]);
}
