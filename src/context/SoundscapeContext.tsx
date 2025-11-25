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

  // Initialize audio element
  useEffect(() => {
    // Load preferences from localStorage
    const savedVolume = localStorage.getItem('soundscape_volume');
    const savedAutoPlay = localStorage.getItem('soundscape_auto_play');
    
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
        audioRef.current = null;
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
    const clampedVol = Math.max(0, Math.min(1, vol));
    setVolumeState(clampedVol);
    previousVolumeRef.current = clampedVol;
    
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = clampedVol;
    }
    
    localStorage.setItem('soundscape_volume', clampedVol.toString());
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        // Unmute - restore volume AND ensure audio is playing
        audioRef.current.volume = previousVolumeRef.current;
        setIsMuted(false);
        
        // Ensure audio is playing (it might have been paused by browser)
        if (audioRef.current.paused && isPlaying) {
          audioRef.current.play().catch((err) => {
            console.warn('[Soundscape] Resume after unmute failed:', err);
          });
        }
      } else {
        // Mute
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, isPlaying]);

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
