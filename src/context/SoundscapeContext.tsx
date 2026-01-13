import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { stopAllLoopingSoundsForPath, removeFromRegistry } from '@/lib/playLoopingSound';
import * as AudioManager from '@/audio/SoundscapeAudioManager';

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
  startFresh: (initialVolume?: number) => void;
  handoffAudio: (audioInstance: HTMLAudioElement) => void;
  pauseForPriorityAudio: () => void;
  resumeAfterPriorityAudio: () => void;
}

const SoundscapeContext = createContext<SoundscapeContextType | undefined>(undefined);

const DEFAULT_VOLUME = 0.05;
const AMBIENT_TRACK = '/sounds/vitanaland/maxina-ambient-music.mp3';

export function SoundscapeProvider({ children }: { children: ReactNode }) {
  // State synced from AudioManager
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack] = useState(AMBIENT_TRACK);
  const [pendingAutoPlay, setPendingAutoPlay] = useState(false);
  
  // Keep ref to audio for handoff
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(DEFAULT_VOLUME);

  // Initialize AudioManager on mount
  useEffect(() => {
    // Increment mount counter for debugging
    const mountCount = AudioManager.incrementMountCount();
    const bootId = AudioManager.getBootId();
    
    console.log(`[SoundscapeProvider] Mount #${mountCount} | Boot ID: ${bootId}`);
    
    // Get audio element reference FIRST
    audioRef.current = AudioManager.getAudio();
    
    // REMOUNT DETECTION: If audio is already playing from a previous mount, just sync state
    if (mountCount > 1 && audioRef.current && !audioRef.current.paused) {
      console.log('[SoundscapeProvider] Remount detected - audio already playing, syncing state only');
      setIsPlaying(true);
      setVolumeState(audioRef.current.volume);
      setIsMuted(AudioManager.getIsMuted());
      
      // Still subscribe to updates
      const unsubscribe = AudioManager.subscribe((state) => {
        setIsPlaying(state.isPlaying);
        setVolumeState(state.volume);
        setIsMuted(state.isMuted);
      });
      
      // Attach listeners for state sync
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleVolumeChange = () => setVolumeState(audioRef.current?.volume ?? DEFAULT_VOLUME);
      
      audioRef.current.addEventListener('play', handlePlay);
      audioRef.current.addEventListener('pause', handlePause);
      audioRef.current.addEventListener('volumechange', handleVolumeChange);
      
      return () => {
        unsubscribe();
        if (audioRef.current) {
          audioRef.current.removeEventListener('play', handlePlay);
          audioRef.current.removeEventListener('pause', handlePause);
          audioRef.current.removeEventListener('volumechange', handleVolumeChange);
        }
      };
    }
    
    // First mount or audio not playing - full initialization
    console.log('[SoundscapeProvider] Initializing AudioManager');
    AudioManager.initialize();
    
    // Load saved preferences
    const savedVolume = localStorage.getItem('soundscape_volume');
    const savedAutoPlay = localStorage.getItem('soundscape_auto_play');
    const savedMuted = localStorage.getItem('soundscape_muted');
    
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      setVolumeState(vol);
      previousVolumeRef.current = vol;
      audioRef.current.volume = vol;
    }
    
    if (savedMuted === 'true') {
      setIsMuted(true);
    }
    
    // Subscribe to manager state changes
    const unsubscribe = AudioManager.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setVolumeState(state.volume);
      setIsMuted(state.isMuted);
    });
    
    // Sync initial state
    const state = AudioManager.getState();
    setIsPlaying(state.isPlaying);
    setVolumeState(state.volume);
    setIsMuted(state.isMuted);
    
    // Handle auto-play if enabled (only on first mount)
    if (mountCount === 1 && savedAutoPlay === 'true' && audioRef.current.paused) {
      audioRef.current.play()
        .then(() => {
          console.log('[SoundscapeProvider] Auto-play succeeded');
          setIsPlaying(true);
        })
        .catch((err) => {
          if (err.name === 'NotAllowedError') {
            console.log('[SoundscapeProvider] Auto-play blocked, waiting for interaction');
            setPendingAutoPlay(true);
          }
        });
    }
    
    // Attach play/pause listeners for state sync
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => setVolumeState(audioRef.current?.volume ?? DEFAULT_VOLUME);
    
    audioRef.current.addEventListener('play', handlePlay);
    audioRef.current.addEventListener('pause', handlePause);
    audioRef.current.addEventListener('volumechange', handleVolumeChange);
    
    return () => {
      unsubscribe();
      if (audioRef.current) {
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.removeEventListener('volumechange', handleVolumeChange);
      }
    };
  }, []);

  // Handle pending auto-play on first interaction
  useEffect(() => {
    if (!pendingAutoPlay) return;
    
    const handleInteraction = () => {
      if (audioRef.current && pendingAutoPlay) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setPendingAutoPlay(false);
            console.log('[SoundscapeProvider] Audio started after user interaction');
          })
          .catch((err) => {
            console.warn('[SoundscapeProvider] Failed to start audio:', err);
          });
      }
      
      document.removeEventListener('click', handleInteraction, true);
      document.removeEventListener('touchstart', handleInteraction, true);
    };
    
    document.addEventListener('click', handleInteraction, true);
    document.addEventListener('touchstart', handleInteraction, true);
    
    return () => {
      document.removeEventListener('click', handleInteraction, true);
      document.removeEventListener('touchstart', handleInteraction, true);
    };
  }, [pendingAutoPlay]);

  // Kill orphaned audio helper
  const killOrphanedAudio = useCallback(() => {
    const filename = AMBIENT_TRACK.split('/').pop() || '';
    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach((audio) => {
      if (audio.src.includes(filename) && audio !== audioRef.current) {
        console.log('[SoundscapeProvider] Killing orphaned audio:', audio.src);
        audio.pause();
        audio.src = '';
        audio.load();
      }
    });
  }, []);

  const play = useCallback(() => {
    AudioManager.play()
      .then(() => {
        setIsPlaying(true);
        setPendingAutoPlay(false);
      })
      .catch((err) => {
        if (err.name === 'NotAllowedError') {
          setPendingAutoPlay(true);
        } else {
          console.warn('[SoundscapeProvider] Play failed:', err);
        }
      });
  }, []);

  const pause = useCallback(() => {
    AudioManager.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    
    if (clamped === 0) {
      killOrphanedAudio();
    }
    
    AudioManager.setVolume(clamped);
    setVolumeState(clamped);
    previousVolumeRef.current = clamped;
  }, [killOrphanedAudio]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    
    if (newMuted) {
      killOrphanedAudio();
    }
    
    AudioManager.setMuted(newMuted);
    setIsMuted(newMuted);
  }, [isMuted, killOrphanedAudio]);

  const startFresh = useCallback((initialVolume = DEFAULT_VOLUME) => {
    AudioManager.startFresh(initialVolume);
    setVolumeState(initialVolume);
    previousVolumeRef.current = initialVolume;
  }, []);

  const handoffAudio = useCallback((externalAudio: HTMLAudioElement) => {
    console.log('[SoundscapeProvider] handoffAudio called');
    
    if (!externalAudio) return;

    // Dispose of old audio if different
    if (audioRef.current && audioRef.current !== externalAudio) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // Take ownership
    audioRef.current = externalAudio;
    removeFromRegistry(externalAudio);
    
    // Configure
    externalAudio.loop = true;
    externalAudio.volume = isMuted ? 0 : volume;

    // Sync state
    setIsPlaying(!externalAudio.paused);
    setVolumeState(externalAudio.volume);
  }, [isMuted, volume]);

  const pauseForPriorityAudio = useCallback(() => {
    AudioManager.pauseForForeground();
  }, []);

  const resumeAfterPriorityAudio = useCallback(() => {
    AudioManager.resumeAfterForeground();
  }, []);

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
    startFresh,
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

/**
 * Optional variant for components that may render outside the provider
 * (e.g. global overlays). Returns undefined instead of throwing.
 */
export function useOptionalSoundscape() {
  return useContext(SoundscapeContext);
}

