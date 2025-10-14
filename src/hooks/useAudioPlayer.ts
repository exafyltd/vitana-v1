import { useState, useCallback, useRef, useEffect } from 'react';

interface AudioMediaData {
  id: string;
  title: string;
  creator: string;
  audioUrl: string;
  duration: number;
  imageUrl?: string;
  mediaType?: 'music' | 'podcast';
}

interface UseAudioPlayerReturn {
  currentMedia: AudioMediaData | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  
  playMedia: (media: AudioMediaData) => void;
  togglePlay: () => void;
  pause: () => void;
  seek: (time: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  closeMedia: () => void;
  
  audioRef: React.RefObject<HTMLAudioElement>;
  
  // Legacy aliases for backward compatibility
  currentPodcast: AudioMediaData | null;
  playPodcast: (podcast: AudioMediaData) => void;
  closePodcast: () => void;
}

// Global state for audio player (singleton pattern)
export let globalState: {
  currentMedia: AudioMediaData | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  audioElement: HTMLAudioElement | null;
  listeners: Set<() => void>;
} = {
  currentMedia: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 1,
  audioElement: null,
  listeners: new Set(),
};

export const notifyListeners = () => {
  globalState.listeners.forEach(listener => listener());
};

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    globalState.listeners.add(listener);
    return () => {
      globalState.listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      globalState.audioElement = audioRef.current;
      // Apply current playback settings
      audioRef.current.playbackRate = globalState.playbackRate;
      audioRef.current.volume = globalState.volume;
    }
  }, [audioRef.current]);

  const playMedia = useCallback((media: AudioMediaData) => {
    // If same media, just toggle play
    if (globalState.currentMedia?.id === media.id) {
      togglePlay();
      return;
    }
    
    // Pause current audio if exists
    if (globalState.audioElement) {
      globalState.audioElement.pause();
      globalState.audioElement.currentTime = 0;
    }
    
    globalState.currentMedia = media;
    globalState.isPlaying = true;
    globalState.currentTime = 0;
    globalState.duration = media.duration || 0;
    
    notifyListeners();
  }, []);

  const togglePlay = useCallback(() => {
    if (!globalState.audioElement) return;

    if (globalState.isPlaying) {
      globalState.audioElement.pause();
      globalState.isPlaying = false;
    } else {
      globalState.audioElement.play().catch(console.error);
      globalState.isPlaying = true;
    }
    
    notifyListeners();
  }, []);

  const pause = useCallback(() => {
    if (globalState.audioElement) {
      globalState.audioElement.pause();
      globalState.isPlaying = false;
      notifyListeners();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (globalState.audioElement) {
      globalState.audioElement.currentTime = time;
      globalState.currentTime = time;
      notifyListeners();
    }
  }, []);

  const skipForward = useCallback((seconds: number) => {
    if (globalState.audioElement) {
      const newTime = Math.min(globalState.currentTime + seconds, globalState.duration);
      globalState.audioElement.currentTime = newTime;
      globalState.currentTime = newTime;
      notifyListeners();
    }
  }, []);

  const skipBackward = useCallback((seconds: number) => {
    if (globalState.audioElement) {
      const newTime = Math.max(globalState.currentTime - seconds, 0);
      globalState.audioElement.currentTime = newTime;
      globalState.currentTime = newTime;
      notifyListeners();
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (globalState.audioElement) {
      globalState.audioElement.playbackRate = rate;
      globalState.playbackRate = rate;
      notifyListeners();
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (globalState.audioElement) {
      globalState.audioElement.volume = volume;
      globalState.volume = volume;
      notifyListeners();
    }
  }, []);

  const closeMedia = useCallback(() => {
    if (globalState.audioElement) {
      globalState.audioElement.pause();
      globalState.audioElement.currentTime = 0;
    }
    globalState.currentMedia = null;
    globalState.isPlaying = false;
    globalState.currentTime = 0;
    globalState.duration = 0;
    notifyListeners();
  }, []);

  return {
    currentMedia: globalState.currentMedia,
    isPlaying: globalState.isPlaying,
    currentTime: globalState.currentTime,
    duration: globalState.duration,
    playbackRate: globalState.playbackRate,
    volume: globalState.volume,
    
    playMedia,
    togglePlay,
    pause,
    seek,
    skipForward,
    skipBackward,
    setPlaybackRate,
    setVolume,
    closeMedia,
    
    audioRef,
    
    // Legacy aliases for backward compatibility
    currentPodcast: globalState.currentMedia,
    playPodcast: playMedia,
    closePodcast: closeMedia,
  };
}

// Helper to update time from audio element
export function updateAudioTime(time: number) {
  globalState.currentTime = time;
  notifyListeners();
}

export function updateAudioDuration(duration: number) {
  globalState.duration = duration;
  notifyListeners();
}
