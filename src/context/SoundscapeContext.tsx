import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { stopAllLoopingSoundsForPath } from '@/lib/playLoopingSound';

interface SoundscapeContextType {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTrack: string;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  handoffAudio: (audioInstance: HTMLAudioElement) => void;
  pauseForPriorityAudio: () => void;
  resumeAfterPriorityAudio: () => void;
}

const SoundscapeContext = createContext<SoundscapeContextType | undefined>(undefined);

const DEFAULT_VOLUME = 0.05;
const AMBIENT_TRACK = '/sounds/vitanaland/maxina-ambient-music.mp3';

export function SoundscapeProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack] = useState(AMBIENT_TRACK);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(DEFAULT_VOLUME);
  const [pausedByPriority, setPausedByPriority] = useState(false);
  const wasPlayingBeforePriorityRef = useRef(false);
  
  // Use refs for state that callbacks need to access
  const isMutedRef = useRef(isMuted);
  const isPlayingRef = useRef(isPlaying);

  // Store event handler refs for proper cleanup
  const handleVolumeChangeRef = useRef<(() => void) | null>(null);
  const handlePlayRef = useRef<(() => void) | null>(null);
  const handlePauseRef = useRef<(() => void) | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Helper to attach event listeners to an audio element
  const attachListeners = useCallback((audio: HTMLAudioElement) => {
    console.log('[Soundscape] Attaching event listeners to audio element');
    
    // Remove old listeners if they exist
    if (handleVolumeChangeRef.current) {
      audio.removeEventListener('volumechange', handleVolumeChangeRef.current);
    }
    if (handlePlayRef.current) {
      audio.removeEventListener('play', handlePlayRef.current);
    }
    if (handlePauseRef.current) {
      audio.removeEventListener('pause', handlePauseRef.current);
    }

    // Create new handlers
    const handleVolumeChange = () => {
      console.log('[Soundscape] Audio volumechange event:', audio.volume);
      setVolumeState(audio.volume);
    };

    const handlePlay = () => {
      console.log('[Soundscape] Audio play event');
      setIsPlaying(true);
    };

    const handlePause = () => {
      console.log('[Soundscape] Audio pause event');
      setIsPlaying(false);
    };

    // Store refs and attach
    handleVolumeChangeRef.current = handleVolumeChange;
    handlePlayRef.current = handlePlay;
    handlePauseRef.current = handlePause;

    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    console.log('[Soundscape] Event listeners attached successfully');
  }, []);

  // Initialize audio element
  useEffect(() => {
    // Load preferences from localStorage
    const savedVolume = localStorage.getItem('soundscape_volume');
    const savedAutoPlay = localStorage.getItem('soundscape_auto_play');
    
    console.log('[Soundscape] Initializing with savedVolume:', savedVolume, 'savedAutoPlay:', savedAutoPlay);
    
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      setVolumeState(vol);
      previousVolumeRef.current = vol;
    }

    // Create persistent audio element
    if (!audioRef.current) {
      const audio = new Audio(AMBIENT_TRACK);
      audio.loop = true;
      audio.volume = savedVolume ? parseFloat(savedVolume) : DEFAULT_VOLUME;
      audioRef.current = audio;

      console.log('[Soundscape] Audio element created:', {
        src: audio.src,
        volume: audio.volume,
        loop: audio.loop
      });

      // Attach event listeners
      attachListeners(audio);

      // Auto-play if preference is set
      if (savedAutoPlay === 'true') {
        audio.play().catch((err) => {
          console.warn('[Soundscape] Auto-play blocked:', err);
        });
        setIsPlaying(true);
      }
    }

    return () => {
      // Cleanup on unmount
      console.log('[Soundscape] Cleaning up audio element');
      if (audioRef.current && handleVolumeChangeRef.current && handlePlayRef.current && handlePauseRef.current) {
        audioRef.current.removeEventListener('volumechange', handleVolumeChangeRef.current);
        audioRef.current.removeEventListener('play', handlePlayRef.current);
        audioRef.current.removeEventListener('pause', handlePauseRef.current);
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, [attachListeners]);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.warn('[Soundscape] Play failed:', err);
      });
      setIsPlaying(true);
      localStorage.setItem('soundscape_auto_play', 'true');
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorage.setItem('soundscape_auto_play', 'false');
    }
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const setVolume = useCallback((vol: number) => {
    console.log('[Soundscape] setVolume called with:', vol, 'current isMuted:', isMutedRef.current);
    
    const clampedVol = Math.max(0, Math.min(1, vol));
    setVolumeState(clampedVol);
    previousVolumeRef.current = clampedVol;
    
    if (!audioRef.current) {
      console.warn('[Soundscape] setVolume: audioRef.current is null');
      return;
    }

    // Only apply volume if not muted
    if (!isMutedRef.current) {
      audioRef.current.volume = clampedVol;
      console.log('[Soundscape] Applied volume to audio element:', clampedVol, 'actual:', audioRef.current.volume);
    } else {
      console.log('[Soundscape] Skipped applying volume (muted), but saved for unmute:', clampedVol);
    }
    
    localStorage.setItem('soundscape_volume', clampedVol.toString());
  }, []);

  const toggleMute = useCallback(() => {
    console.log('[Soundscape] toggleMute called, current isMuted:', isMutedRef.current, 'isPlaying:', isPlayingRef.current);
    
    if (!audioRef.current) {
      console.warn('[Soundscape] toggleMute: audioRef.current is null');
      return;
    }

    if (isMutedRef.current) {
      // Unmute - restore volume AND ensure audio is playing
      const targetVolume = previousVolumeRef.current;
      console.log('[Soundscape] Unmuting, restoring volume to:', targetVolume);
      audioRef.current.volume = targetVolume;
      setIsMuted(false);
      
      console.log('[Soundscape] Audio element volume after unmute:', audioRef.current.volume);
      
      // Ensure audio is playing (it might have been paused by browser)
      if (audioRef.current.paused && isPlayingRef.current) {
        console.log('[Soundscape] Audio was paused, resuming playback');
        audioRef.current.play().catch((err) => {
          console.warn('[Soundscape] Resume after unmute failed:', err);
        });
      }
    } else {
      // Mute
      console.log('[Soundscape] Muting, setting volume to 0');
      audioRef.current.volume = 0;
      setIsMuted(true);
      console.log('[Soundscape] Audio element volume after mute:', audioRef.current.volume);
    }
  }, []);

  const handoffAudio = useCallback((externalAudio: HTMLAudioElement) => {
    console.log('[Soundscape] handoffAudio called with external audio:', {
      src: externalAudio.src,
      paused: externalAudio.paused,
      volume: externalAudio.volume
    });

    // Dispose of any existing audio element if it's different
    if (audioRef.current && audioRef.current !== externalAudio) {
      console.log('[Soundscape] Disposing existing audio element');
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
    }

    // Take ownership of the external audio element
    audioRef.current = externalAudio;

    // Remove from activeLoopingSounds to prevent conflicts
    stopAllLoopingSoundsForPath(externalAudio.src);
    console.log('[Soundscape] Removed handed-off audio from activeLoopingSounds');

    // Attach event listeners to the new audio element
    attachListeners(externalAudio);

    // Apply current state to the handed-off audio
    externalAudio.loop = true;
    externalAudio.volume = isMutedRef.current ? 0 : volume;

    // If we should be playing, ensure the audio is playing
    if (isPlayingRef.current && externalAudio.paused) {
      console.log('[Soundscape] Starting playback on handed-off audio');
      externalAudio.play().catch((err) => {
        console.error('[Soundscape] Failed to play handed-off audio:', err);
      });
    } else if (!isPlayingRef.current && !externalAudio.paused) {
      console.log('[Soundscape] Pausing handed-off audio');
      externalAudio.pause();
    }

    // Sync UI state with actual audio state
    setIsPlaying(!externalAudio.paused);
    setVolumeState(externalAudio.volume);

    console.log('[Soundscape] Handoff complete, new audio state:', {
      isPlaying: !externalAudio.paused,
      volume: externalAudio.volume,
      isMuted: isMutedRef.current
    });
  }, [volume, attachListeners]);

  const pauseForPriorityAudio = useCallback(() => {
    if (isPlaying && audioRef.current && !pausedByPriority) {
      wasPlayingBeforePriorityRef.current = true;
      audioRef.current.pause();
      setIsPlaying(false);
      setPausedByPriority(true);
      console.log('[Soundscape] Paused for priority audio');
    }
  }, [isPlaying, pausedByPriority]);

  const resumeAfterPriorityAudio = useCallback(() => {
    if (pausedByPriority && wasPlayingBeforePriorityRef.current && audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.warn('[Soundscape] Resume after priority audio failed:', err);
      });
      setIsPlaying(true);
      setPausedByPriority(false);
      wasPlayingBeforePriorityRef.current = false;
      console.log('[Soundscape] Resumed after priority audio ended');
    }
  }, [pausedByPriority]);

  // Debug utility to inspect audio state
  const debugAudioState = useCallback(() => {
    console.log('[Soundscape Debug] Current state:', {
      isPlaying,
      volume,
      isMuted,
      audioElement: audioRef.current ? {
        src: audioRef.current.src,
        volume: audioRef.current.volume,
        paused: audioRef.current.paused,
        muted: audioRef.current.muted,
        loop: audioRef.current.loop
      } : null,
      allAudioElements: document.querySelectorAll('audio').length
    });
  }, [isPlaying, volume, isMuted]);

  // Emergency function to kill all audio
  const killAllAudio = useCallback(() => {
    console.log('[Soundscape] killAllAudio called - stopping all audio');
    
    // Stop our audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Stop all looping sounds
    stopAllLoopingSoundsForPath('');

    // Query and pause all audio elements in DOM
    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach((audio, index) => {
      console.log(`[Soundscape] Killing audio element ${index}:`, audio.src);
      audio.pause();
      audio.currentTime = 0;
    });

    // Reset state
    setIsPlaying(false);
    
    console.log('[Soundscape] All audio killed');
  }, []);

  // Expose debug functions globally for console access
  useEffect(() => {
    (window as any).debugSoundscape = debugAudioState;
    (window as any).killAllAudio = killAllAudio;
    
    return () => {
      delete (window as any).debugSoundscape;
      delete (window as any).killAllAudio;
    };
  }, [debugAudioState, killAllAudio]);

  const value: SoundscapeContextType = {
    isPlaying,
    volume,
    isMuted,
    currentTrack,
    play,
    pause,
    toggle,
    setVolume,
    toggleMute,
    handoffAudio,
    pauseForPriorityAudio,
    resumeAfterPriorityAudio,
  };

  return (
    <SoundscapeContext.Provider value={value}>
      {children}
    </SoundscapeContext.Provider>
  );
}

export function useSoundscape() {
  const context = useContext(SoundscapeContext);
  if (context === undefined) {
    throw new Error('useSoundscape must be used within a SoundscapeProvider');
  }
  return context;
}
