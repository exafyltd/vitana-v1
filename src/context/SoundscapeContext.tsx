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
  const userExplicitlyPausedRef = useRef(false);
  
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
    const savedMuted = localStorage.getItem('soundscape_muted');
    
    console.log('[Soundscape] Initializing with savedVolume:', savedVolume, 'savedAutoPlay:', savedAutoPlay, 'savedMuted:', savedMuted);
    
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      setVolumeState(vol);
      previousVolumeRef.current = vol;
    }

    // Get or create the singleton audio element
    const audio = getOrCreateAudioElement(AMBIENT_TRACK);
    audioRef.current = audio;
    
    // Apply current volume and mute state
    audio.volume = savedVolume ? parseFloat(savedVolume) : DEFAULT_VOLUME;
    
    if (savedMuted === 'true') {
      audio.muted = true;
      setIsMuted(true);
    } else {
      audio.muted = false;
      setIsMuted(false);
    }
    
    console.log('[Soundscape] Audio element initialized:', {
      src: audio.src,
      volume: audio.volume,
      loop: audio.loop,
      paused: audio.paused
    });

    // Attach event listeners
    attachListeners(audio);

  // Auto-play if preference is set AND user hasn't explicitly paused
    if (savedAutoPlay === 'true' && audio.paused && !userExplicitlyPausedRef.current) {
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
      // Sync isPlaying
      const actuallyPlaying = !audioRef.current.paused;
      if (actuallyPlaying !== isPlaying) {
        console.log('[Soundscape] Syncing isPlaying state: actuallyPlaying=', actuallyPlaying, 'isPlaying=', isPlaying);
        setIsPlaying(actuallyPlaying);
      }
      
      // Sync isMuted
      const actuallyMuted = audioRef.current.muted;
      if (actuallyMuted !== isMuted) {
        console.log('[Soundscape] Syncing isMuted state: actuallyMuted=', actuallyMuted, 'isMuted=', isMuted);
        setIsMuted(actuallyMuted);
      }
    }
  }, []); // Only run once on mount

  // Sync audioRef with window singleton (HMR recovery)
  useEffect(() => {
    if (window.__SOUNDSCAPE_AUDIO__ && audioRef.current !== window.__SOUNDSCAPE_AUDIO__) {
      console.log('[Soundscape] Syncing audioRef with window singleton');
      audioRef.current = window.__SOUNDSCAPE_AUDIO__;
      attachListeners(window.__SOUNDSCAPE_AUDIO__);
    }
  }, [attachListeners]); // Only run when attachListeners changes


  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.warn('[Soundscape] Play failed:', err);
      });
      setIsPlaying(true);
      localStorage.setItem('soundscape_auto_play', 'true');
      userExplicitlyPausedRef.current = false; // Clear explicit pause flag
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    setIsPlaying(false);
    localStorage.setItem('soundscape_auto_play', 'false');
    userExplicitlyPausedRef.current = true;
  }, []);

  const toggle = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        play();
      } else {
        pause();
      }
    }
  }, [play, pause]);

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
    if (!audioRef.current) return;
    
    if (isMutedRef.current) {
      // UNMUTE - restore volume
      console.log('[Soundscape] Unmuting, restoring volume:', previousVolumeRef.current);
      audioRef.current.muted = false;
      audioRef.current.volume = previousVolumeRef.current;
      setIsMuted(false);
      localStorage.setItem('soundscape_muted', 'false');
    } else {
      // MUTE - silence but keep playing
      console.log('[Soundscape] Muting, keeping playback active');
      audioRef.current.muted = true;
      setIsMuted(true);
      localStorage.setItem('soundscape_muted', 'true');
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
    // Don't resume if user explicitly paused the music
    if (userExplicitlyPausedRef.current) {
      console.log('[Soundscape] Not resuming - user explicitly paused');
      setPausedByPriority(false);
      wasPlayingBeforePriorityRef.current = false;
      return;
    }
    
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
