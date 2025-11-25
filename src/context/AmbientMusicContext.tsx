import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';

interface AmbientMusicContextType {
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

const AmbientMusicContext = createContext<AmbientMusicContextType | undefined>(undefined);

const DEFAULT_VOLUME = 0.05;
const AMBIENT_TRACK = '/sounds/vitanaland/maxina-ambient-music.mp3';

export function AmbientMusicProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack] = useState(AMBIENT_TRACK);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(DEFAULT_VOLUME);

  // Initialize audio element
  useEffect(() => {
    // Load preferences from localStorage
    const savedVolume = localStorage.getItem('ambient_music_volume');
    const savedAutoPlay = localStorage.getItem('ambient_music_auto_play');
    
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
          console.warn('[AmbientMusic] Auto-play blocked:', err);
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
        console.warn('[AmbientMusic] Play failed:', err);
      });
      setIsPlaying(true);
      localStorage.setItem('ambient_music_auto_play', 'true');
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorage.setItem('ambient_music_auto_play', 'false');
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
    
    localStorage.setItem('ambient_music_volume', clampedVol.toString());
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        // Unmute
        audioRef.current.volume = previousVolumeRef.current;
        setIsMuted(false);
      } else {
        // Mute
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted]);

  const handoffAudio = useCallback((externalAudio: HTMLAudioElement) => {
    // Take ownership of an existing audio element from login/intro screens
    if (!audioRef.current && externalAudio) {
      console.log('[AmbientMusic] Taking ownership of external audio');
      audioRef.current = externalAudio;
      audioRef.current.loop = true;
      audioRef.current.volume = volume;
      setIsPlaying(!externalAudio.paused);
    }
  }, [volume]);

  const value: AmbientMusicContextType = {
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
    <AmbientMusicContext.Provider value={value}>
      {children}
    </AmbientMusicContext.Provider>
  );
}

export function useAmbientMusic() {
  const context = useContext(AmbientMusicContext);
  if (context === undefined) {
    throw new Error('useAmbientMusic must be used within an AmbientMusicProvider');
  }
  return context;
}
