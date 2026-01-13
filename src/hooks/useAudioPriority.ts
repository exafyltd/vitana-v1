import { useEffect, useState, useContext } from 'react';
import { useStreamingState } from '@/context/StreamingStateContext';
import { globalState as audioPlayerGlobalState } from '@/hooks/useAudioPlayer';
import * as AudioManager from '@/audio/SoundscapeAudioManager';

// Import the context directly to check if we're inside the provider
import { createContext, useContext as useContextReact } from 'react';

/**
 * Central Audio Priority Manager
 * Automatically pauses Soundscape when priority audio is active:
 * - Media player (music/podcasts/videos)
 * - VITANA Orb (audio overlay or glass mode)
 * 
 * Note: Call monitoring is handled separately in authenticated contexts
 * where CallProvider is available.
 * 
 * SAFETY: This hook gracefully handles being called outside SoundscapeProvider
 * by falling back to direct AudioManager calls.
 */
export function useAudioPriority() {
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

  // Handle priority audio changes - use AudioManager directly for safety
  useEffect(() => {
    const vitanaOrbActive = audioOverlayVisible || glassModeActive;
    const hasPriorityAudio = mediaPlayerActive || vitanaOrbActive;

    if (hasPriorityAudio) {
      AudioManager.pauseForForeground();
    } else {
      AudioManager.resumeAfterForeground();
    }
  }, [
    mediaPlayerActive,
    audioOverlayVisible,
    glassModeActive,
  ]);
}
