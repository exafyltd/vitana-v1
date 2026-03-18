/**
 * SoundscapeAudioManager - Singleton module for Soundscape audio control
 * 
 * This module provides:
 * 1. A singleton audio element that persists across navigation
 * 2. Global media precedence listeners (foreground media always wins)
 * 3. State persistence for continuity (localStorage on mobile, sessionStorage on desktop)
 * 4. Separation of Soundscape mute from video/audio mute
 * 5. Full page reload detection and recovery
 * 6. Mobile engine guard: prevents unnecessary src/load/currentTime resets
 */

const AMBIENT_TRACK = '/sounds/vitanaland/maxina-ambient-music.mp3';
const SESSION_KEY_TIME = 'soundscape_currentTime';
const SESSION_KEY_PLAYING = 'soundscape_wasPlaying';
const SESSION_KEY_VOLUME = 'soundscape_volume';
const SESSION_KEY_TRACK = 'soundscape_track';
const MOBILE_PERSIST_KEY_TIME = 'soundscape_mobile_currentTime';
const MOBILE_PERSIST_KEY_PLAYING = 'soundscape_mobile_wasPlaying';
const MOBILE_PERSIST_KEY_TRACK = 'soundscape_mobile_track';
const MOBILE_PERSIST_KEY_TRACK_SRC = 'soundscape_mobile_trackSrc';
const MOBILE_PERSIST_KEY_VOLUME = 'soundscape_mobile_volume';
const MOBILE_PERSIST_KEY_MUTED = 'soundscape_mobile_muted';

// Proper mobile detection: user agent + viewport check (runs once at module load)
function detectMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent || (navigator as any).vendor || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Also check viewport as backup
  const isNarrowViewport = window.matchMedia('(max-width: 767px)').matches;
  
  // Consider mobile if either condition is true (UA is more reliable for tablets)
  return isMobileUA || isNarrowViewport;
}

const isMobileDevice = detectMobileDevice();

// Module-level state (survives across component mounts)
let audioElement: HTMLAudioElement | null = null;
let isInitialized = false;
let currentTrackId: string = 'ambient'; // Track ID for engine guard

// State refs (module-level to avoid stale closures)
let soundscapeMuted = false;
let soundscapeWasPlayingBeforeForeground = false;
let userExplicitlyPaused = false;
let currentlyPausedByForeground = false;

// Mobile resume banner state
let needsUserGestureToResume = false;
type ResumeBannerListener = (show: boolean) => void;
const resumeBannerListeners = new Set<ResumeBannerListener>();

export function subscribeToResumeBanner(listener: ResumeBannerListener): () => void {
  resumeBannerListeners.add(listener);
  // Immediately notify current state
  listener(needsUserGestureToResume);
  return () => resumeBannerListeners.delete(listener);
}

function notifyResumeBannerListeners(show: boolean) {
  needsUserGestureToResume = show;
  resumeBannerListeners.forEach(listener => listener(show));
}

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
  needsUserGesture: boolean;
}

function notifyListeners() {
  const state = getState();
  stateListeners.forEach(listener => listener(state));
}

// Persist currentTime periodically for continuity
let persistInterval: ReturnType<typeof setInterval> | null = null;

function startPersisting() {
  if (persistInterval) return;
  
  // On mobile, persist every 1.5s to localStorage for app resume/reload
  // On desktop, persist every 500ms to sessionStorage
  const interval = isMobileDevice ? 1500 : 500;
  
  persistInterval = setInterval(() => {
    if (audioElement && !audioElement.paused) {
      try {
        const currentTime = audioElement.currentTime.toString();
        const volume = audioElement.volume.toString();
        const track = audioElement.src || AMBIENT_TRACK;
        
        // Always persist to sessionStorage
        sessionStorage.setItem(SESSION_KEY_TIME, currentTime);
        sessionStorage.setItem(SESSION_KEY_PLAYING, 'true');
        sessionStorage.setItem(SESSION_KEY_VOLUME, volume);
        sessionStorage.setItem(SESSION_KEY_TRACK, track);
        
        // On mobile, also persist full state to localStorage for app resume/reload
        if (isMobileDevice) {
          localStorage.setItem(MOBILE_PERSIST_KEY_TIME, currentTime);
          localStorage.setItem(MOBILE_PERSIST_KEY_PLAYING, 'true');
          localStorage.setItem(MOBILE_PERSIST_KEY_TRACK, currentTrackId);
          localStorage.setItem(MOBILE_PERSIST_KEY_TRACK_SRC, audioElement.src || AMBIENT_TRACK);
          localStorage.setItem(MOBILE_PERSIST_KEY_VOLUME, volume);
          localStorage.setItem(MOBILE_PERSIST_KEY_MUTED, soundscapeMuted.toString());
        }
      } catch (e) {
        // Storage may be unavailable
      }
    }
  }, interval);
}

function stopPersisting() {
  if (persistInterval) {
    clearInterval(persistInterval);
    persistInterval = null;
  }
}

/** Pause persistence during active ORB/Live sessions to reduce CPU/I/O */
export function pausePersisting() {
  stopPersisting();
}

/** Resume persistence after ORB/Live session ends */
export function resumePersisting() {
  startPersisting();
}

// Boot ID for detecting full page reloads (changes on every app boot)
const BOOT_ID = `boot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
 * Get or create the singleton audio element
 */
export function getAudio(): HTMLAudioElement {
  // INVARIANT: There must never be two audio elements for the ambient track.
  
  // Check window singleton first (survives HMR)
  if (window.__SOUNDSCAPE_AUDIO__) {
    const winAudio = window.__SOUNDSCAPE_AUDIO__;
    
    // If module-level audioElement is a DIFFERENT element, dispose the duplicate
    if (audioElement && audioElement !== winAudio) {
      console.log('[AudioManager] Disposing duplicate module-level audio element');
      audioElement.pause();
      audioElement.src = '';
      audioElement.load();
    }
    
    audioElement = winAudio;
    return audioElement;
  }
  
  if (audioElement) {
    return audioElement;
  }
  
  const navType = detectNavigationType();
  console.log('[AudioManager] Creating new audio element, navigation type:', navType);
  
  audioElement = new Audio(AMBIENT_TRACK);
  audioElement.loop = true;
  audioElement.preload = 'auto';
  
  // MOBILE: Restore full state from localStorage IMMEDIATELY (before any play attempts)
  // This is critical for instant resume after WebView reloads
  if (isMobileDevice) {
    try {
      const mobileTrackSrc = localStorage.getItem(MOBILE_PERSIST_KEY_TRACK_SRC);
      const mobileTime = localStorage.getItem(MOBILE_PERSIST_KEY_TIME);
      const mobileVolume = localStorage.getItem(MOBILE_PERSIST_KEY_VOLUME);
      const mobileMuted = localStorage.getItem(MOBILE_PERSIST_KEY_MUTED);
      const mobileTrackId = localStorage.getItem(MOBILE_PERSIST_KEY_TRACK);
      
      // Restore track src if saved
      if (mobileTrackSrc) {
        audioElement.src = mobileTrackSrc;
        console.log('[AudioManager] Mobile: restored track src:', mobileTrackSrc);
      }
      
      // Restore track ID
      if (mobileTrackId) {
        currentTrackId = mobileTrackId;
      }
      
      // Restore currentTime BEFORE any play attempts
      if (mobileTime) {
        const time = parseFloat(mobileTime);
        if (!isNaN(time) && time > 0) {
          audioElement.currentTime = time;
          console.log('[AudioManager] Mobile: pre-restored time to', time);
        }
      }
      
      // Restore volume
      if (mobileVolume) {
        const vol = parseFloat(mobileVolume);
        if (!isNaN(vol) && vol >= 0 && vol <= 1) {
          audioElement.volume = vol;
          console.log('[AudioManager] Mobile: restored volume:', vol);
        }
      }
      
      // Restore mute preference from localStorage (persists across sessions)
      const savedMutedMobile = localStorage.getItem('soundscape_muted');
      soundscapeMuted = savedMutedMobile === 'true';
      audioElement.muted = soundscapeMuted;
    } catch (e) {
      console.warn('[AudioManager] Mobile restore failed:', e);
    }
  } else {
    // DESKTOP: Restore state from sessionStorage
    try {
      const savedTime = sessionStorage.getItem(SESSION_KEY_TIME);
      const savedVolume = sessionStorage.getItem(SESSION_KEY_VOLUME);
      const wasPlaying = sessionStorage.getItem(SESSION_KEY_PLAYING);
      
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
      
      // If was playing and this is a reload, we'll need user gesture to resume
      if (wasPlaying === 'true' && navType === 'reload') {
        console.log('[AudioManager] Was playing before reload, will resume on interaction');
        userExplicitlyPaused = false;
      }
    } catch (e) {
      // sessionStorage may be unavailable
    }
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
  
  // Restore mute preference from localStorage (persists across sessions)
  const savedMutedInit = localStorage.getItem('soundscape_muted');
  soundscapeMuted = savedMutedInit === 'true';
  
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
    // Don't persist auto-play=false — next visit should always start with music
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
    needsUserGesture: needsUserGestureToResume,
  };
}

/**
 * Get current track ID for engine guard
 */
export function getCurrentTrackId(): string {
  return currentTrackId;
}

/**
 * Mobile engine guard: Check if requested track is already active
 * If so, returns false (do not restart). If different, returns true.
 */
export function shouldLoadTrack(trackIdOrSrc: string): boolean {
  const audio = getAudio();
  
  // Check by track ID (universal, not mobile-only)
  if (trackIdOrSrc === currentTrackId) {
    console.log('[AudioManager] Engine guard: same trackId, skip reload');
    return false;
  }
  
  // Check by src
  if (audio.src && (audio.src === trackIdOrSrc || audio.src.includes(trackIdOrSrc))) {
    console.log('[AudioManager] Engine guard: same src, skip reload');
    return false;
  }
  
  return true;
}

/**
 * Set track with mobile engine guard
 * On mobile, skips if same track is already active
 */
export function setTrack(trackIdOrSrc: string, trackUrl?: string) {
  const audio = getAudio();
  const url = trackUrl || trackIdOrSrc;
  
  // Mobile engine guard
  if (isMobileDevice) {
    if (trackIdOrSrc === currentTrackId) {
      console.log('[AudioManager] Mobile: same track, not reloading');
      return;
    }
    if (audio.src && audio.src.includes(trackIdOrSrc)) {
      console.log('[AudioManager] Mobile: same src, not reloading');
      return;
    }
  }
  
  // Actually load the new track
  currentTrackId = trackIdOrSrc;
  audio.src = url;
  audio.load();
  console.log('[AudioManager] Track changed to:', trackIdOrSrc);
}

/**
 * Try to resume audio on mobile after app resume/reload
 * Shows "Tap to resume" banner if autoplay blocked
 */
export function attemptMobileResume(): void {
  if (!isMobileDevice) return;
  
  const savedTime = localStorage.getItem(MOBILE_PERSIST_KEY_TIME);
  const savedTrackSrc = localStorage.getItem(MOBILE_PERSIST_KEY_TRACK_SRC);
  const wasPlaying = localStorage.getItem(MOBILE_PERSIST_KEY_PLAYING);
  // Skip if muted this session (in-memory only, not persisted)
  if (soundscapeMuted) {
    console.log('[AudioManager] Mobile resume skipped: muted this session');
    return;
  }
  
  // Don't resume if foreground media is active
  if (activeForegroundMedia.size > 0) {
    console.log('[AudioManager] Mobile resume skipped: foreground media active');
    return;
  }
  
  const audio = getAudio();
  
  // Restore track src if needed (canonical comparison)
  if (savedTrackSrc) {
    const currentFilename = audio.src ? audio.src.split('/').pop() : '';
    const savedFilename = savedTrackSrc.split('/').pop();
    if (currentFilename !== savedFilename) {
      audio.src = savedTrackSrc;
      console.log('[AudioManager] Mobile: restored track src:', savedTrackSrc);
    }
  }
  
  // Restore position
  if (savedTime) {
    const time = parseFloat(savedTime);
    if (!isNaN(time) && time > 0) {
      audio.currentTime = time;
      console.log('[AudioManager] Mobile: restored time to', time);
    }
  }
  
  // Wait for audio to be ready before playing
  const tryPlay = () => {
    audio.play()
      .then(() => {
        console.log('[AudioManager] Mobile resume succeeded');
        notifyResumeBannerListeners(false);
        notifyListeners();
      })
      .catch((err) => {
        if (err.name === 'NotAllowedError') {
          console.log('[AudioManager] Mobile resume blocked, showing banner');
          notifyResumeBannerListeners(true);
        }
      });
  };
  
  // If audio is ready, play immediately; otherwise wait for canplay
  if (audio.readyState >= 2) {
    tryPlay();
  } else {
    audio.addEventListener('canplay', tryPlay, { once: true });
  }
}

/**
 * User tapped the resume banner
 */
export function handleResumeBannerTap(): void {
  const audio = getAudio();
  
  audio.play()
    .then(() => {
      console.log('[AudioManager] Resume from banner succeeded');
      notifyResumeBannerListeners(false);
      notifyListeners();
    })
    .catch((err) => {
      console.warn('[AudioManager] Resume from banner failed:', err);
    });
}

/**
 * Check if we're on mobile
 */
export function isMobile(): boolean {
  return isMobileDevice;
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
 * Kill any duplicate audio elements in the DOM that match the ambient track
 * but aren't the current singleton. Safety net against duplicate streams.
 */
function killDuplicateAudio() {
  const singleton = audioElement || window.__SOUNDSCAPE_AUDIO__;
  const allAudio = document.querySelectorAll('audio');
  allAudio.forEach((el) => {
    if (el.src?.includes('maxina-ambient-music') && el !== singleton) {
      console.log('[AudioManager] killDuplicateAudio: destroying duplicate', el.src?.substring(0, 60));
      el.pause();
      el.src = '';
      el.load();
    }
  });
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
  // Safety net: scan DOM for duplicate ambient audio elements and destroy them
  killDuplicateAudio();
  
  const audio = getAudio();
  
  // IDEMPOTENT guard 1: Already playing the ambient track → do nothing
  if (!audio.paused && audio.src.includes('maxina-ambient-music')) {
    console.log('[AudioManager] startFresh skipped - already playing');
    return;
  }
  
  // Guard 2: Audio is mid-session (has position) → just resume, don't reinitialize
  // This catches the race condition where audio is briefly paused (foreground transition)
  // but currentTime > 0.5 means it's clearly mid-playback, not a fresh start.
  if (audio.src.includes('maxina-ambient-music') && audio.currentTime > 0.5) {
    console.log('[AudioManager] startFresh: audio mid-session, resuming in place at', audio.currentTime);
    if (audio.paused) {
      audio.play().catch(err => console.warn('[AudioManager] Resume in place failed:', err));
    }
    return;
  }
  
  // If user explicitly paused, don't auto-start
  if (userExplicitlyPaused) {
    console.log('[AudioManager] startFresh skipped - user explicitly paused');
    return;
  }
  
  // If user has muted soundscape (persisted), don't auto-start
  if (soundscapeMuted) {
    console.log('[AudioManager] startFresh skipped - soundscape is muted (persisted)');
    return;
  }
  
  // Save position in case browser resets on play()
  const savedTime = audio.currentTime;
  
  // Only set volume if not already set (don't overwrite user preference)
  const savedVolume = localStorage.getItem('soundscape_volume');
  if (!savedVolume) {
    audio.volume = initialVolume;
  }
  
  audio.play()
    .then(() => {
      // Restore position if browser reset it during play()
      if (savedTime > 1 && audio.currentTime < 1) {
        audio.currentTime = savedTime;
        console.log('[AudioManager] startFresh: restored currentTime to', savedTime);
      }
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
