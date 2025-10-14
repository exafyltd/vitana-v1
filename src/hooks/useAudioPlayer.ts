import { useState, useCallback, useRef, useEffect } from 'react';

interface PodcastData {
  id: string;
  title: string;
  host: string;
  audioUrl: string;
  duration: number;
  imageUrl?: string;
}

interface UseAudioPlayerReturn {
  currentPodcast: PodcastData | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  
  playPodcast: (podcast: PodcastData) => void;
  togglePlay: () => void;
  pause: () => void;
  seek: (time: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  closePodcast: () => void;
  
  audioRef: React.RefObject<HTMLAudioElement>;
}

// Global state for audio player (singleton pattern)
let globalState: {
  currentPodcast: PodcastData | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  audioElement: HTMLAudioElement | null;
  listeners: Set<() => void>;
} = {
  currentPodcast: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 1,
  audioElement: null,
  listeners: new Set(),
};

const notifyListeners = () => {
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
    if (audioRef.current && !globalState.audioElement) {
      globalState.audioElement = audioRef.current;
    }
  }, []);

  const playPodcast = useCallback((podcast: PodcastData) => {
    // If same podcast, just toggle play
    if (globalState.currentPodcast?.id === podcast.id) {
      togglePlay();
      return;
    }
    
    // Pause current audio if exists
    if (globalState.audioElement) {
      globalState.audioElement.pause();
      globalState.audioElement.currentTime = 0;
    }
    
    globalState.currentPodcast = podcast;
    globalState.isPlaying = true;
    globalState.currentTime = 0;
    globalState.duration = podcast.duration || 0;
    
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

  const closePodcast = useCallback(() => {
    if (globalState.audioElement) {
      globalState.audioElement.pause();
      globalState.audioElement.currentTime = 0;
    }
    globalState.currentPodcast = null;
    globalState.isPlaying = false;
    globalState.currentTime = 0;
    globalState.duration = 0;
    notifyListeners();
  }, []);

  return {
    currentPodcast: globalState.currentPodcast,
    isPlaying: globalState.isPlaying,
    currentTime: globalState.currentTime,
    duration: globalState.duration,
    playbackRate: globalState.playbackRate,
    volume: globalState.volume,
    
    playPodcast,
    togglePlay,
    pause,
    seek,
    skipForward,
    skipBackward,
    setPlaybackRate,
    setVolume,
    closePodcast,
    
    audioRef,
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
