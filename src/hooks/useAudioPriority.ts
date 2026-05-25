import { useEffect, useState } from 'react';
import { useStreamingState } from '@/context/StreamingStateContext';
import { globalState as audioPlayerGlobalState } from '@/hooks/useAudioPlayer';
import { useOrbWidgetSessionActive } from '@/lib/orbWidgetSession';
import * as AudioManager from '@/audio/SoundscapeAudioManager';

/**
 * Central Audio Priority Manager
 * Automatically pauses Soundscape when priority audio is active:
 * - Media player (music/podcasts/videos)
 * - VITANA Orb React overlay (audio overlay or glass mode)
 * - VITANA Orb widget (external gateway widget, AudioContext-based TTS)
 *
 * Uses AudioManager directly so it can safely run from global initializers
 * without depending on Soundscape React context timing/HMR state.
 */
export function useAudioPriority() {
  const { audioOverlayVisible, glassModeActive } = useStreamingState();
  const orbWidgetSessionActive = useOrbWidgetSessionActive();

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
    const vitanaOrbActive = audioOverlayVisible || glassModeActive || orbWidgetSessionActive;
    const hasPriorityAudio = mediaPlayerActive || vitanaOrbActive;

    if (hasPriorityAudio) {
      AudioManager.pauseForForeground();
    } else {
      AudioManager.resumeAfterForeground();
    }
  }, [mediaPlayerActive, audioOverlayVisible, glassModeActive, orbWidgetSessionActive]);
}
