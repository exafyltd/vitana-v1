import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { stopAllLoopingSoundsForPath, removeFromRegistry } from '@/lib/playLoopingSound';

// Store audio element on window to survive HMR module reloads
declare global {
  interface Window {
    __SOUNDSCAPE_AUDIO__?: HTMLAudioElement;
  }
}

function getOrCreateAudioElement(src: string): HTMLAudioElement {
  const filename = src.split('/').pop() || '';
  
  // FIRST: Stop any orphaned audio elements playing this track
  const allAudio = document.querySelectorAll('audio');
  allAudio.forEach((audio) => {
    if (audio.src.includes(filename) && audio !== window.__SOUNDSCAPE_AUDIO__) {
      console.log('[Soundscape] Found orphaned audio element, stopping it:', audio.src);
      audio.pause();
      audio.src = '';
      audio.load();
    }
  });

  // Check for existing HMR-surviving audio element
  const existing = window.__SOUNDSCAPE_AUDIO__;
  if (existing && existing.src.includes(filename)) {
    console.log('[Soundscape] Reusing HMR-surviving audio element');
    existing.loop = true;
    return existing;
  }

  // If there's an existing element but for a different src, stop and dispose it
  if (existing) {
    console.log('[Soundscape] Stopping old HMR audio element before creating new one');
    existing.pause();
    existing.src = '';
    existing.load();
  }

  // Create new audio element and persist it on window
  console.log('[Soundscape] Creating new audio element');
  const audio = new Audio(src);
  audio.loop = true;
  window.__SOUNDSCAPE_AUDIO__ = audio;
  return audio;
}

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

  // Initialize audio element using HMR-resilient singleton
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

    // Get or create the singleton audio element
    const audio = getOrCreateAudioElement(AMBIENT_TRACK);
    audioRef.current = audio;
    
    // Apply current volume
    audio.volume = savedVolume ? parseFloat(savedVolume) : DEFAULT_VOLUME;
    
    console.log('[Soundscape] Audio element initialized:', {
      src: audio.src,
      volume: audio.volume,
      loop: audio.loop,
      paused: audio.paused
    });

    // Attach event listeners
    attachListeners(audio);

    // Auto-play if preference is set
    if (savedAutoPlay === 'true' && audio.paused) {
      audio.play().catch((err) => {
        console.warn('[Soundscape] Auto-play blocked:', err);
      });
      setIsPlaying(true);
    } else {
      // Sync state with actual audio state
      setIsPlaying(!audio.paused);
    }

    // DO NOT cleanup/destroy the audio element on unmount
    // The singleton persists across HMR cycles
    return () => {
      // Only remove event listeners, don't destroy audio
      if (audioRef.current && handleVolumeChangeRef.current) {
        audioRef.current.removeEventListener('volumechange', handleVolumeChangeRef.current);
        audioRef.current.removeEventListener('play', handlePlayRef.current!);
        audioRef.current.removeEventListener('pause', handlePauseRef.current!);
      }
      console.log('[Soundscape] Removed event listeners (audio element persists)');
    };
  }, [attachListeners]);

  // Sync React state with actual audio element state (handles HMR recovery)
  useEffect(() => {
    if (audioRef.current) {
      const actuallyPlaying = !audioRef.current.paused;
      if (actuallyPlaying !== isPlaying) {
        console.log('[Soundscape] Syncing state: actuallyPlaying=', actuallyPlaying, 'isPlaying=', isPlaying);
        setIsPlaying(actuallyPlaying);
      }
    }
  });

  // Sync audioRef with window singleton (HMR recovery)
  useEffect(() => {
    if (window.__SOUNDSCAPE_AUDIO__ && audioRef.current !== window.__SOUNDSCAPE_AUDIO__) {
      console.log('[Soundscape] Syncing audioRef with window singleton');
      audioRef.current = window.__SOUNDSCAPE_AUDIO__;
      attachListeners(window.__SOUNDSCAPE_AUDIO__);
    }
  });

  // Aggressive periodic cleanup - ALWAYS run to catch orphaned audio
  useEffect(() => {
    const intervalId = setInterval(() => {
      const filename = AMBIENT_TRACK.split('/').pop() || '';
      
      // If we think we're muted/paused, ensure ALL audio is actually stopped
      if (isMuted || !isPlaying) {
        document.querySelectorAll('audio').forEach((audio) => {
          if (audio.src.includes(filename) && !audio.paused) {
            console.log('[Soundscape] Periodic cleanup: forcing pause on:', audio.src);
            audio.pause();
            audio.muted = true;
            audio.volume = 0;
          }
        });
        
        // Also ensure window singleton is stopped
        if (window.__SOUNDSCAPE_AUDIO__ && !window.__SOUNDSCAPE_AUDIO__.paused) {
          console.log('[Soundscape] Periodic cleanup: forcing pause on window singleton');
          window.__SOUNDSCAPE_AUDIO__.pause();
          window.__SOUNDSCAPE_AUDIO__.muted = true;
        }
      }
    }, 500); // Check every 500ms
    
    return () => clearInterval(intervalId);
  }, [isMuted, isPlaying]);

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
    const filename = AMBIENT_TRACK.split('/').pop() || '';
    
    // Target 1: window.__SOUNDSCAPE_AUDIO__
    if (window.__SOUNDSCAPE_AUDIO__) {
      window.__SOUNDSCAPE_AUDIO__.pause();
    }
    
    // Target 2: audioRef.current
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Target 3: ALL DOM audio elements with ambient track
    document.querySelectorAll('audio').forEach((audio) => {
      if (audio.src.includes(filename)) {
        audio.pause();
      }
    });
    
    setIsPlaying(false);
    localStorage.setItem('soundscape_auto_play', 'false');
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Helper function to kill orphaned audio elements
  const killOrphanedAudio = useCallback(() => {
    const filename = AMBIENT_TRACK.split('/').pop() || '';
    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach((audio) => {
      // Kill any audio playing the ambient track that isn't our controlled singleton
      if (audio.src.includes(filename) && audio !== audioRef.current) {
        console.log('[Soundscape] Killing orphaned audio:', audio.src);
        audio.pause();
        audio.src = '';
        audio.load();
      }
    });
  }, []);

  const setVolume = useCallback((vol: number) => {
    console.log('[Soundscape] setVolume called with:', vol, 'current isMuted:', isMutedRef.current);
    
    const clampedVol = Math.max(0, Math.min(1, vol));
    
    // If setting volume to 0, also kill orphaned audio
    if (clampedVol === 0) {
      killOrphanedAudio();
    }
    
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
  }, [killOrphanedAudio]);

  const toggleMute = useCallback(() => {
    const filename = AMBIENT_TRACK.split('/').pop() || '';
    
    console.log('[Soundscape] toggleMute called, isMuted:', isMutedRef.current);
    
    if (isMutedRef.current) {
      // UNMUTE
      const targetVolume = previousVolumeRef.current;
      
      // Target 1: window.__SOUNDSCAPE_AUDIO__
      if (window.__SOUNDSCAPE_AUDIO__) {
        window.__SOUNDSCAPE_AUDIO__.muted = false;
        window.__SOUNDSCAPE_AUDIO__.volume = targetVolume;
      }
      
      // Target 2: audioRef.current (if different)
      if (audioRef.current && audioRef.current !== window.__SOUNDSCAPE_AUDIO__) {
        audioRef.current.muted = false;
        audioRef.current.volume = targetVolume;
      }
      
      setIsMuted(false);
    } else {
      // MUTE - Kill everything
      
      // Target 1: window.__SOUNDSCAPE_AUDIO__
      if (window.__SOUNDSCAPE_AUDIO__) {
        window.__SOUNDSCAPE_AUDIO__.muted = true;
        window.__SOUNDSCAPE_AUDIO__.volume = 0;
        window.__SOUNDSCAPE_AUDIO__.pause();
      }
      
      // Target 2: audioRef.current (if different)
      if (audioRef.current && audioRef.current !== window.__SOUNDSCAPE_AUDIO__) {
        audioRef.current.muted = true;
        audioRef.current.volume = 0;
        audioRef.current.pause();
      }
      
      // Target 3: ALL DOM audio elements with the ambient track (nuclear fallback)
      document.querySelectorAll('audio').forEach((audio) => {
        if (audio.src.includes(filename)) {
          console.log('[Soundscape] Muting DOM audio element:', audio.src);
          audio.muted = true;
          audio.volume = 0;
          audio.pause();
        }
      });
      
      setIsMuted(true);
      setIsPlaying(false);
    }
  }, []);

  const handoffAudio = useCallback((externalAudio: HTMLAudioElement) => {
    console.log('[Soundscape] handoffAudio called with external audio:', {
      src: externalAudio.src,
      paused: externalAudio.paused,
      volume: externalAudio.volume
    });

    if (!externalAudio) return;

    // Dispose of any existing audio element if it's different
    if (audioRef.current && audioRef.current !== externalAudio) {
      console.log('[Soundscape] Disposing existing audio element');
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
    }

    // Take ownership of the external audio element
    audioRef.current = externalAudio;

    // Remove from activeLoopingSounds registry without stopping it
    removeFromRegistry(externalAudio);
    console.log('[Soundscape] Removed handed-off audio from registry');

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

  // Emergency function to kill all audio (NUCLEAR OPTION)
  const killAllAudio = useCallback(() => {
    console.log('[Soundscape] killAllAudio called - NUCLEAR OPTION');
    
    // Kill the window-persisted audio singleton
    if (window.__SOUNDSCAPE_AUDIO__) {
      window.__SOUNDSCAPE_AUDIO__.pause();
      window.__SOUNDSCAPE_AUDIO__.src = '';
      window.__SOUNDSCAPE_AUDIO__.load();
      delete window.__SOUNDSCAPE_AUDIO__;
    }
    
    // Also kill our ref if it's still pointing at an element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current.load();
    }

    // Stop all looping sounds from registry
    stopAllLoopingSoundsForPath('');

    // Query and pause ALL audio elements in DOM (safety net)
    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach((audio, index) => {
      console.log(`[Soundscape] Killing audio element ${index}:`, audio.src);
      audio.pause();
      audio.src = '';
      audio.load();
    });

    // Reset state
    setIsPlaying(false);
    audioRef.current = null;
    
    console.log('[Soundscape] All audio NUKED');
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
