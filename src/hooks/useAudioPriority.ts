import { useEffect } from 'react';
import { useSoundscape } from '@/context/SoundscapeContext';
import { useStreamingState } from '@/context/StreamingStateContext';
import { useCall } from '@/context/CallContext';
import { globalState as audioPlayerGlobalState } from '@/hooks/useAudioPlayer';

/**
 * Central Audio Priority Manager
 * Automatically pauses Soundscape when priority audio is active:
 * - Media player (music/podcasts/videos)
 * - Active calls (audio/video)
 * - VITANA Orb (audio overlay or glass mode)
 */
export function useAudioPriority() {
  const { pauseForPriorityAudio, resumeAfterPriorityAudio } = useSoundscape();
  const { audioOverlayVisible, glassModeActive } = useStreamingState();
  const { activeCall } = useCall();

  useEffect(() => {
    // Check all priority audio sources
    const mediaPlayerActive = audioPlayerGlobalState.isPlaying;
    const callActive = activeCall?.state === 'active' || activeCall?.state === 'calling';
    const vitanaOrbActive = audioOverlayVisible || glassModeActive;

    const hasPriorityAudio = mediaPlayerActive || callActive || vitanaOrbActive;

    if (hasPriorityAudio) {
      pauseForPriorityAudio();
    } else {
      resumeAfterPriorityAudio();
    }
  }, [
    audioPlayerGlobalState.isPlaying,
    activeCall?.state,
    audioOverlayVisible,
    glassModeActive,
    pauseForPriorityAudio,
    resumeAfterPriorityAudio,
  ]);
}
