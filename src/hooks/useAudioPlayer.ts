import { useState, useCallback, useEffect } from 'react';

declare global {
  interface Window {
    __MEDIA_PLAYER_AUDIO__?: HTMLAudioElement;
  }
}

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

  // Legacy aliases for backward compatibility
  currentPodcast: AudioMediaData | null;
  playPodcast: (podcast: AudioMediaData) => void;
  closePodcast: () => void;
}

/** Get or create the singleton audio element (survives component unmounts & HMR) */
export function getMediaAudioElement(): HTMLAudioElement {
  if (window.__MEDIA_PLAYER_AUDIO__) {
    return window.__MEDIA_PLAYER_AUDIO__;
  }
  const audio = new Audio();
  audio.preload = 'metadata';
  window.__MEDIA_PLAYER_AUDIO__ = audio;
  return audio;
}

// Global state for audio player (singleton pattern)
export let globalState: {
  currentMedia: AudioMediaData | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  audioElement: HTMLAudioElement;
  listeners: Set<() => void>;
} = {
  currentMedia: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 1,
  audioElement: getMediaAudioElement(),
  listeners: new Set(),
};

export const notifyListeners = () => {
  globalState.listeners.forEach(listener => listener());
};

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    globalState.listeners.add(listener);
    return () => {
      globalState.listeners.delete(listener);
    };
  }, []);

  const playMedia = useCallback((media: AudioMediaData) => {
    // If same media, just toggle play
    if (globalState.currentMedia?.id === media.id) {
      togglePlay();
      return;
    }

    const audio = globalState.audioElement;
    // Pause current audio if playing
    audio.pause();
    audio.currentTime = 0;

    globalState.currentMedia = media;
    globalState.isPlaying = true;
    globalState.currentTime = 0;
    globalState.duration = media.duration || 0;

    // Set source and play on the singleton element
    audio.src = media.audioUrl;
    audio.playbackRate = globalState.playbackRate;
    audio.volume = globalState.volume;
    audio.play().catch(console.error);

    notifyListeners();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = globalState.audioElement;

    if (globalState.isPlaying) {
      audio.pause();
      globalState.isPlaying = false;
    } else {
      audio.play().catch(console.error);
      globalState.isPlaying = true;
    }

    notifyListeners();
  }, []);

  const pause = useCallback(() => {
    globalState.audioElement.pause();
    globalState.isPlaying = false;
    notifyListeners();
  }, []);

  const seek = useCallback((time: number) => {
    globalState.audioElement.currentTime = time;
    globalState.currentTime = time;
    notifyListeners();
  }, []);

  const skipForward = useCallback((seconds: number) => {
    const newTime = Math.min(globalState.currentTime + seconds, globalState.duration);
    globalState.audioElement.currentTime = newTime;
    globalState.currentTime = newTime;
    notifyListeners();
  }, []);

  const skipBackward = useCallback((seconds: number) => {
    const newTime = Math.max(globalState.currentTime - seconds, 0);
    globalState.audioElement.currentTime = newTime;
    globalState.currentTime = newTime;
    notifyListeners();
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    globalState.audioElement.playbackRate = rate;
    globalState.playbackRate = rate;
    notifyListeners();
  }, []);

  const setVolume = useCallback((volume: number) => {
    globalState.audioElement.volume = volume;
    globalState.volume = volume;
    notifyListeners();
  }, []);

  const closeMedia = useCallback(() => {
    const audio = globalState.audioElement;
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
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
