/**
 * SoundscapeAudioManager - Singleton module for Soundscape audio control
 * 
 * This module provides:
 * 1. A singleton audio element that persists across navigation
 * 2. Global media precedence listeners (foreground media always wins)
 * 3. State persistence to localStorage for continuity across reloads
 * 4. Separation of Soundscape mute from video/audio mute
 * 5. Full page reload detection and recovery
 * 6. Boot ID and mount counter for debugging SPA remount issues
 */

const AMBIENT_TRACK = '/sounds/vitanaland/maxina-ambient-music.mp3';

// Use localStorage for persistence across reloads (not sessionStorage)
const STORAGE_KEY_TIME = 'soundscape_currentTime';
const STORAGE_KEY_PLAYING = 'soundscape_wasPlaying';
const STORAGE_KEY_VOLUME = 'soundscape_volume';
const STORAGE_KEY_TRACK = 'soundscape_track';
const STORAGE_KEY_USER_ENABLED = 'soundscape_userEnabled';

// === Boot ID & Mount Counter for debugging SPA remounts ===
// Boot ID changes only on full page reload, not SPA navigation
const BOOT_ID = (window as any).__APP_BOOT_ID__ ?? 
  ((window as any).__APP_BOOT_ID__ = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6));

// Store boot ID in localStorage for debugging
try {
  localStorage.setItem('app_boot_id', BOOT_ID);
} catch (e) {
  // localStorage may be unavailable
}

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
  bootId: string;
  mountCount: number;
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
        // Use localStorage for persistence across reloads
        localStorage.setItem(STORAGE_KEY_TIME, audioElement.currentTime.toString());
        localStorage.setItem(STORAGE_KEY_PLAYING, 'true');
        localStorage.setItem(STORAGE_KEY_VOLUME, audioElement.volume.toString());
        localStorage.setItem(STORAGE_KEY_TRACK, audioElement.src || AMBIENT_TRACK);
        localStorage.setItem(STORAGE_KEY_USER_ENABLED, 'true');
      } catch (e) {
        // localStorage may be unavailable
      }
    }
  }, 500); // Persist every 500ms for better recovery
}

function stopPersisting() {
  if (persistInterval) {
    clearInterval(persistInterval);
    persistInterval = null;
  }
}

/**
 * Detect if this is a full page reload vs SPA navigation
 */
function detectNavigationType(): 'reload' | 'navigate' | 'back_forward' | 'prerender' | 'unknown' {
  try {
    const navEntries = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const navType = navEntries[0].type as 'reload' | 'navigate' | 'back_forward' | 'prerender';
      console.log('[AudioManager] Navigation type:', navType, '| Boot ID:', BOOT_ID);
      return navType;
    }
  } catch (e) {
    // Fallback
  }
  console.log('[AudioManager] Navigation type: unknown | Boot ID:', BOOT_ID);
  return 'unknown';
}

/**
 * Increment and get mount count (for debugging provider remounts)
 */
export function incrementMountCount(): number {
  const count = ((window as any).__SOUNDSCAPE_MOUNT_COUNT__ || 0) + 1;
  (window as any).__SOUNDSCAPE_MOUNT_COUNT__ = count;
  return count;
}

/**
 * Get current mount count
 */
export function getMountCount(): number {
  return (window as any).__SOUNDSCAPE_MOUNT_COUNT__ || 0;
}

/**
 * Get boot ID
 */
export function getBootId(): string {
  return BOOT_ID;
}

/**
 * Get or create the singleton audio element
 * CRITICAL: This must be truly singleton - audio never recreated on SPA navigation
 */
export function getAudio(): HTMLAudioElement {
  // ABSOLUTE PRIORITY: Check window singleton first (survives HMR and SPA navigation)
  if (window.__SOUNDSCAPE_AUDIO__) {
    // Ensure local ref is synced
    if (!audioElement || audioElement !== window.__SOUNDSCAPE_AUDIO__) {
      audioElement = window.__SOUNDSCAPE_AUDIO__;
      console.log('[AudioManager] Reusing existing audio singleton');
    }
    return audioElement;
  }
  
  // Secondary check: module-level ref
  if (audioElement) {
    window.__SOUNDSCAPE_AUDIO__ = audioElement;
    return audioElement;
  }
  
  // Only create new audio element if no singleton exists (true reload scenario)
  const navType = detectNavigationType();
  console.log('[AudioManager] Creating NEW audio element | Boot ID:', BOOT_ID, '| Nav type:', navType);
  
  audioElement = new Audio(AMBIENT_TRACK);
  audioElement.loop = true;
  audioElement.preload = 'auto';
  
  // Restore state from localStorage (survives reloads)
  try {
    const savedTime = localStorage.getItem(STORAGE_KEY_TIME);
    const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
    const wasPlaying = localStorage.getItem(STORAGE_KEY_PLAYING);
    
    // CRITICAL: Restore currentTime BEFORE any play attempt
    if (savedTime) {
      const time = parseFloat(savedTime);
      if (!isNaN(time) && time > 0) {
        audioElement.currentTime = time;
        console.log('[AudioManager] Restored currentTime:', time);
      }
    }
    
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      if (!isNaN(vol) && vol >= 0 && vol <= 1) {
        audioElement.volume = vol;
        console.log('[AudioManager] Restored volume:', vol);
      }
    }
    
    // If was playing, mark for auto-resume on interaction
    if (wasPlaying === 'true') {
      console.log('[AudioManager] Was playing before reload, will resume on interaction');
      userExplicitlyPaused = false;
    }
  } catch (e) {
    // localStorage may be unavailable
  }
  
  // Persist on window for HMR/SPA survival
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
    bootId: BOOT_ID,
    mountCount: getMountCount(),
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
 * IDEMPOTENT: If already playing the ambient track, do nothing.
 * This prevents route changes from restarting music.
 */
export function startFresh(initialVolume = 0.05) {
  const audio = getAudio();
  
  // IDEMPOTENT: If already playing, do not restart
  if (!audio.paused && audio.src.includes('maxina-ambient-music')) {
    console.log('[AudioManager] startFresh skipped - already playing');
    return;
  }
  
  // If user explicitly paused, don't auto-start
  if (userExplicitlyPaused) {
    console.log('[AudioManager] startFresh skipped - user explicitly paused');
    return;
  }
  
  // Respect saved mute preference
  const savedMuted = localStorage.getItem('soundscape_muted');
  if (savedMuted === 'true') {
    soundscapeMuted = true;
    audio.muted = true;
    console.log('[AudioManager] startFresh skipped - soundscape is muted');
    return;
  }
  
  soundscapeMuted = false;
  audio.muted = false;
  
  // Only set volume if not already set (don't overwrite user preference)
  const savedVolume = localStorage.getItem('soundscape_volume');
  if (!savedVolume) {
    audio.volume = initialVolume;
  }
  
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
    __APP_BOOT_ID__?: string;
    __SOUNDSCAPE_MOUNT_COUNT__?: number;
  }
}
