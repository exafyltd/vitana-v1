import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';

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

  // Keep refs in sync with state
  useEffect(() => {
    isMutedRef.current = isMuted;
    console.log('[Soundscape] isMuted state changed:', isMuted);
  }, [isMuted]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    console.log('[Soundscape] isPlaying state changed:', isPlaying);
  }, [isPlaying]);

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

      // Add event listeners to sync state with audio element
      const handleVolumeChange = () => {
        if (audioRef.current) {
          const newVolume = audioRef.current.volume;
          console.log('[Soundscape] Audio element volume changed:', newVolume);
          setVolumeState(newVolume);
          if (newVolume === 0 && !isMutedRef.current) {
            setIsMuted(true);
          } else if (newVolume > 0 && isMutedRef.current) {
            setIsMuted(false);
          }
        }
      };

      const handlePlay = () => {
        console.log('[Soundscape] Audio element playing');
        setIsPlaying(true);
      };

      const handlePause = () => {
        console.log('[Soundscape] Audio element paused');
        setIsPlaying(false);
      };

      audio.addEventListener('volumechange', handleVolumeChange);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);

      console.log('[Soundscape] Audio element created and event listeners attached');

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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('volumechange', () => {});
        audioRef.current.removeEventListener('play', () => {});
        audioRef.current.removeEventListener('pause', () => {});
        audioRef.current = null;
        console.log('[Soundscape] Cleanup completed');
      }
    };
  }, []);

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
    if (externalAudio) {
      console.log('[Soundscape] Taking ownership of external audio');
      
      // If there's already an audio element, stop and dispose it
      if (audioRef.current && audioRef.current !== externalAudio) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      // Take ownership of the external audio
      audioRef.current = externalAudio;
      audioRef.current.loop = true;
      
      // Check if the handed-off audio is playing
      const wasPlaying = !externalAudio.paused;
      
      if (wasPlaying) {
        // Audio is playing - ensure unmuted state and persist preference
        setIsMuted(false);
        audioRef.current.volume = volume;
        setIsPlaying(true);
        localStorage.setItem('soundscape_auto_play', 'true');
      } else {
        // Audio was paused - just take ownership
        audioRef.current.volume = isMuted ? 0 : volume;
        setIsPlaying(false);
      }
    }
  }, [volume, isMuted]);

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
