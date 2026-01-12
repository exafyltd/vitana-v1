/**
 * SoundscapeAudioManager - Singleton module for Soundscape audio control
 * 
 * This module provides:
 * 1. A singleton audio element that persists across navigation
 * 2. Global media precedence listeners (foreground media always wins)
 * 3. State persistence to sessionStorage for continuity
 * 4. Separation of Soundscape mute from video/audio mute
 */

const AMBIENT_TRACK = '/sounds/vitanaland/maxina-ambient-music.mp3';
const SESSION_KEY_TIME = 'soundscape_currentTime';
const SESSION_KEY_PLAYING = 'soundscape_wasPlaying';

// Module-level state (survives across component mounts)
let audioElement: HTMLAudioElement | null = null;
let isInitialized = false;

// State refs (module-level to avoid stale closures)
let soundscapeMuted = false;
let soundscapeWasPlayingBeforeForeground = false;
let userExplicitlyPaused = false;
let currentlyPausedByForeground = false;

// Track active foreground media
const activeForegroundMedia = new Set<HTMLMediaElement>();

// Listeners for React state updates
type StateListener = (state: SoundscapeState) => void;
const stateListeners = new Set<StateListener>();

export interface SoundscapeState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  pausedByForeground: boolean;
}

function notifyListeners() {
  const state = getState();
  stateListeners.forEach(listener => listener(state));
}

// Persist currentTime periodically for continuity
let persistInterval: ReturnType<typeof setInterval> | null = null;

function startPersisting() {
  if (persistInterval) return;
  persistInterval = setInterval(() => {
    if (audioElement && !audioElement.paused) {
      try {
        sessionStorage.setItem(SESSION_KEY_TIME, audioElement.currentTime.toString());
        sessionStorage.setItem(SESSION_KEY_PLAYING, 'true');
      } catch (e) {
        // sessionStorage may be unavailable
      }
    }
  }, 1000);
}

function stopPersisting() {
  if (persistInterval) {
    clearInterval(persistInterval);
    persistInterval = null;
  }
}

/**
 * Get or create the singleton audio element
 */
export function getAudio(): HTMLAudioElement {
  // Check window singleton first (survives HMR)
  if (window.__SOUNDSCAPE_AUDIO__) {
    audioElement = window.__SOUNDSCAPE_AUDIO__;
    return audioElement;
  }
  
  if (audioElement) {
    return audioElement;
  }
  
  console.log('[AudioManager] Creating new audio element');
  audioElement = new Audio(AMBIENT_TRACK);
  audioElement.loop = true;
  audioElement.preload = 'auto';
  
  // Restore currentTime from sessionStorage if available
  try {
    const savedTime = sessionStorage.getItem(SESSION_KEY_TIME);
    if (savedTime) {
      const time = parseFloat(savedTime);
      if (!isNaN(time) && time > 0) {
        audioElement.currentTime = time;
        console.log('[AudioManager] Restored currentTime:', time);
      }
    }
  } catch (e) {
    // sessionStorage may be unavailable
  }
  
  // Persist on window for HMR survival
  window.__SOUNDSCAPE_AUDIO__ = audioElement;
  
  return audioElement;
}

/**
 * Initialize the manager (call once from provider)
 */
export function initialize() {
  if (isInitialized) return;
  isInitialized = true;
  
  console.log('[AudioManager] Initializing global media precedence listeners');
  
  // Get or create audio
  getAudio();
  
  // Load saved muted state
  const savedMuted = localStorage.getItem('soundscape_muted');
  soundscapeMuted = savedMuted === 'true';
  
  // Attach global media event listeners (capture phase)
  document.addEventListener('play', handleGlobalPlay, true);
  document.addEventListener('playing', handleGlobalPlay, true);
  document.addEventListener('pause', handleGlobalPauseOrEnd, true);
  document.addEventListener('ended', handleGlobalPauseOrEnd, true);
  document.addEventListener('volumechange', handleGlobalVolumeChange, true);
  
  // Listen for custom foreground intent (mobile backup)
  window.addEventListener('foreground-audio-intent', handleForegroundIntent);
  
  // Start persisting currentTime
  startPersisting();
  
  console.log('[AudioManager] Initialized with muted:', soundscapeMuted);
}

/**
 * Cleanup (call on app unmount if needed)
 */
export function cleanup() {
  document.removeEventListener('play', handleGlobalPlay, true);
  document.removeEventListener('playing', handleGlobalPlay, true);
  document.removeEventListener('pause', handleGlobalPauseOrEnd, true);
  document.removeEventListener('ended', handleGlobalPauseOrEnd, true);
  document.removeEventListener('volumechange', handleGlobalVolumeChange, true);
  window.removeEventListener('foreground-audio-intent', handleForegroundIntent);
  stopPersisting();
  isInitialized = false;
}

// ===== Global Media Event Handlers =====

function isSoundscapeElement(el: HTMLMediaElement): boolean {
  if (audioElement && el === audioElement) return true;
  if (window.__SOUNDSCAPE_AUDIO__ && el === window.__SOUNDSCAPE_AUDIO__) return true;
  if (el.src?.includes('maxina-ambient-music')) return true;
  return false;
}

function handleGlobalPlay(event: Event) {
  const target = event.target as HTMLMediaElement;
  if (!(target instanceof HTMLVideoElement || target instanceof HTMLAudioElement)) return;
  if (isSoundscapeElement(target)) return;
  
  // Skip muted videos (they don't need audio precedence)
  if (target instanceof HTMLVideoElement && target.muted) {
    console.log('[AudioManager] Skipping muted video play event');
    return;
  }
  
  console.log('[AudioManager] Foreground media started:', target.tagName, target.src?.substring(0, 50));
  
  const hadNoActiveMedia = activeForegroundMedia.size === 0;
  activeForegroundMedia.add(target);
  
  if (hadNoActiveMedia) {
    pauseForForeground();
  }
}

function handleGlobalPauseOrEnd(event: Event) {
  const target = event.target as HTMLMediaElement;
  if (!(target instanceof HTMLVideoElement || target instanceof HTMLAudioElement)) return;
  if (isSoundscapeElement(target)) return;
  
  console.log('[AudioManager] Foreground media stopped:', target.tagName, event.type);
  
  activeForegroundMedia.delete(target);
  
  if (activeForegroundMedia.size === 0) {
    resumeAfterForeground();
  }
}

function handleGlobalVolumeChange(event: Event) {
  const target = event.target as HTMLMediaElement;
  if (!(target instanceof HTMLVideoElement)) return;
  if (isSoundscapeElement(target)) return;
  
  // Video unmuted while playing -> needs precedence
  if (!target.paused && !target.muted) {
    if (!activeForegroundMedia.has(target)) {
      console.log('[AudioManager] Video unmuted while playing');
      const hadNoActiveMedia = activeForegroundMedia.size === 0;
      activeForegroundMedia.add(target);
      if (hadNoActiveMedia) {
        pauseForForeground();
      }
    }
  }
  
  // Video muted -> release precedence
  if (target.muted && activeForegroundMedia.has(target)) {
    console.log('[AudioManager] Video muted, releasing precedence');
    activeForegroundMedia.delete(target);
    if (activeForegroundMedia.size === 0) {
      resumeAfterForeground();
    }
  }
}

function handleForegroundIntent(event: Event) {
  const detail = (event as CustomEvent).detail;
  console.log('[AudioManager] Received foreground-audio-intent:', detail);
  pauseForForeground();
}

// ===== Soundscape Control Methods =====

export function pauseForForeground() {
  const audio = getAudio();
  
  console.log('[AudioManager] pauseForForeground called, isPlaying:', !audio.paused, 'alreadyPaused:', currentlyPausedByForeground);
  
  if (!audio.paused && !currentlyPausedByForeground) {
    soundscapeWasPlayingBeforeForeground = true;
    audio.pause();
    currentlyPausedByForeground = true;
    console.log('[AudioManager] Soundscape paused for foreground media');
    notifyListeners();
  }
}

export function resumeAfterForeground() {
  const audio = getAudio();
  
  console.log('[AudioManager] resumeAfterForeground called, wasPlaying:', soundscapeWasPlayingBeforeForeground, 'userPaused:', userExplicitlyPaused, 'muted:', soundscapeMuted);
  
  // Don't resume if user explicitly paused
  if (userExplicitlyPaused) {
    console.log('[AudioManager] Not resuming - user explicitly paused');
    currentlyPausedByForeground = false;
    soundscapeWasPlayingBeforeForeground = false;
    notifyListeners();
    return;
  }
  
  // Don't resume if user muted
  if (soundscapeMuted) {
    console.log('[AudioManager] Not resuming - soundscape is muted');
    currentlyPausedByForeground = false;
    soundscapeWasPlayingBeforeForeground = false;
    notifyListeners();
    return;
  }
  
  if (currentlyPausedByForeground && soundscapeWasPlayingBeforeForeground) {
    audio.play().catch(err => {
      console.warn('[AudioManager] Resume after foreground failed:', err);
    });
    currentlyPausedByForeground = false;
    soundscapeWasPlayingBeforeForeground = false;
    console.log('[AudioManager] Soundscape resumed after foreground media ended');
    notifyListeners();
  }
}

export function play(): Promise<void> {
  const audio = getAudio();
  userExplicitlyPaused = false;
  localStorage.setItem('soundscape_auto_play', 'true');
  
  return audio.play().then(() => {
    console.log('[AudioManager] Play succeeded');
    notifyListeners();
  });
}

export function pause() {
  const audio = getAudio();
  audio.pause();
  userExplicitlyPaused = true;
  localStorage.setItem('soundscape_auto_play', 'false');
  console.log('[AudioManager] Paused by user');
  notifyListeners();
}

export function toggle() {
  const audio = getAudio();
  if (audio.paused) {
    return play();
  } else {
    pause();
    return Promise.resolve();
  }
}

export function setMuted(muted: boolean) {
  const audio = getAudio();
  soundscapeMuted = muted;
  audio.muted = muted;
  
  if (muted) {
    // Also pause to release audio focus on mobile
    audio.pause();
    console.log('[AudioManager] Muted and paused to release audio focus');
  } else {
    // Unmuting - resume if not explicitly paused
    if (!userExplicitlyPaused) {
      audio.play().catch(err => console.warn('[AudioManager] Unmute play failed:', err));
    }
  }
  
  localStorage.setItem('soundscape_muted', muted.toString());
  notifyListeners();
}

export function toggleMute() {
  setMuted(!soundscapeMuted);
}

export function setVolume(vol: number) {
  const audio = getAudio();
  const clamped = Math.max(0, Math.min(1, vol));
  audio.volume = clamped;
  localStorage.setItem('soundscape_volume', clamped.toString());
  notifyListeners();
}

export function getState(): SoundscapeState {
  const audio = audioElement || getAudio();
  return {
    isPlaying: !audio.paused,
    isMuted: soundscapeMuted,
    volume: audio.volume,
    currentTime: audio.currentTime,
    pausedByForeground: currentlyPausedByForeground,
  };
}

export function getIsPlaying(): boolean {
  const audio = getAudio();
  return !audio.paused;
}

export function getIsMuted(): boolean {
  return soundscapeMuted;
}

export function setUserExplicitlyPaused(paused: boolean) {
  userExplicitlyPaused = paused;
}

export function hasActiveForegroundMedia(): boolean {
  return activeForegroundMedia.size > 0;
}

/**
 * Subscribe to state changes
 */
export function subscribe(listener: StateListener): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

/**
 * Start fresh (for portal entry etc.)
 */
export function startFresh(initialVolume = 0.05) {
  const audio = getAudio();
  
  // Respect saved mute preference
  const savedMuted = localStorage.getItem('soundscape_muted');
  if (savedMuted === 'true') {
    soundscapeMuted = true;
    audio.muted = true;
  } else {
    soundscapeMuted = false;
    audio.muted = false;
  }
  
  audio.volume = initialVolume;
  userExplicitlyPaused = false;
  
  audio.play()
    .then(() => {
      localStorage.setItem('soundscape_auto_play', 'true');
      console.log('[AudioManager] startFresh succeeded');
      notifyListeners();
    })
    .catch(err => {
      console.warn('[AudioManager] startFresh blocked:', err);
    });
}

// Window type declaration
declare global {
  interface Window {
    __SOUNDSCAPE_AUDIO__?: HTMLAudioElement;
  }
}
