import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { stopAllLoopingSoundsForPath, removeFromRegistry } from '@/lib/playLoopingSound';
import * as AudioManager from '@/audio/SoundscapeAudioManager';
import { useAuth } from '@/context/AuthProvider';

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
  const { user } = useAuth();
  // State synced from AudioManager
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack] = useState(AMBIENT_TRACK);
  // pendingAutoPlay removed — music only starts via explicit startFresh() calls
  
  // Keep ref to audio for handoff
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(DEFAULT_VOLUME);

  // Initialize AudioManager on mount
  useEffect(() => {
    console.log('[SoundscapeProvider] Initializing AudioManager');
    AudioManager.initialize();
    
    // Get audio element reference
    audioRef.current = AudioManager.getAudio();
    
    // Load saved preferences
    const savedVolume = localStorage.getItem('soundscape_volume');
    const savedAutoPlay = localStorage.getItem('soundscape_auto_play');
    const savedMuted = localStorage.getItem('soundscape_muted');
    
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      setVolumeState(vol);
      previousVolumeRef.current = vol;
      if (audioRef.current) audioRef.current.volume = vol;
    }
    
    // Restore muted state from storage — persist across sessions until user unmutes
    if (savedMuted === 'true') {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.muted = true;
      console.log('[Soundscape] Restored muted state from localStorage');
    }
    
    // Subscribe to manager state changes
    const unsubscribe = AudioManager.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setVolumeState(state.volume);
      if (localStorage.getItem('soundscape_muted') !== 'true') {
        setIsMuted(state.isMuted);
      }
    });
    
    // Sync initial state
    const state = AudioManager.getState();
    setIsPlaying(state.isPlaying);
    setVolumeState(state.volume);
    if (savedMuted !== 'true') {
      setIsMuted(state.isMuted);
    }
    
    // Audio element is created and configured but NOT auto-played.
    // Playback only starts when startFresh() is explicitly called
    // from MaxinaPortal or IntroExperience.
    console.log('[SoundscapeProvider] Audio initialized, waiting for explicit startFresh()');
    
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

  // pendingAutoPlay effect removed — no global interaction listener.
  // Music only starts via explicit startFresh() from Maxina-context pages.

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
      })
      .catch((err) => {
        if (err.name !== 'NotAllowedError') {
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
    // Universal guard: if already playing the ambient track, do nothing (any platform)
    if (AudioManager.getIsPlaying() && !AudioManager.shouldLoadTrack('ambient')) {
      console.log('[SoundscapeProvider] Skipping startFresh, same track already playing');
      return;
    }
    
    // Proactively clean up any orphaned audio elements before starting
    killOrphanedAudio();
    
    AudioManager.startFresh(initialVolume);
    setVolumeState(initialVolume);
    previousVolumeRef.current = initialVolume;
  }, [killOrphanedAudio]);

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
