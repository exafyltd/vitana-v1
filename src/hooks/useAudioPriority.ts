import { useEffect, useState } from 'react';
import { useStreamingState } from '@/context/StreamingStateContext';
import { globalState as audioPlayerGlobalState } from '@/hooks/useAudioPlayer';
import * as AudioManager from '@/audio/SoundscapeAudioManager';

/**
 * Central Audio Priority Manager
 * Automatically pauses Soundscape when priority audio is active:
 * - Media player (music/podcasts/videos)
 * - VITANA Orb (audio overlay or glass mode)
 *
 * Uses AudioManager directly so it can safely run from global initializers
 * without depending on Soundscape React context timing/HMR state.
 */
export function useAudioPriority() {
  const { audioOverlayVisible, glassModeActive } = useStreamingState();

  // Subscribe to audio player state changes
  const [mediaPlayerActive, setMediaPlayerActive] = useState(audioPlayerGlobalState.isPlaying);

  useEffect(() => {
    const listener = () => {
      setMediaPlayerActive(audioPlayerGlobalState.isPlaying);
    };

    audioPlayerGlobalState.listeners.add(listener);
    setMediaPlayerActive(audioPlayerGlobalState.isPlaying);

    return () => {
      audioPlayerGlobalState.listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const vitanaOrbActive = audioOverlayVisible || glassModeActive;
    const hasPriorityAudio = mediaPlayerActive || vitanaOrbActive;

    if (hasPriorityAudio) {
      AudioManager.pauseForForeground();
    } else {
      AudioManager.resumeAfterForeground();
    }
  }, [mediaPlayerActive, audioOverlayVisible, glassModeActive]);
}
