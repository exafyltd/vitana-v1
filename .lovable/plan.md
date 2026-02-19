

## Fix Soundscape Music Restarting on Navigation

### Problem
When navigating from the Maxina intro screen to the sign-in page, the background music (Soundscape) restarts from the beginning instead of continuing seamlessly.

### Root Cause
The `startFresh()` function is called on both pages (IntroExperience and MaxinaPortal) when the user interacts. While there is an idempotent guard that skips if audio is already playing, on some mobile browsers/WebViews the audio can enter a brief suspended state during route transitions. When `startFresh()` then calls `audio.play()`, the browser may restart playback from the beginning rather than resuming from the saved position.

Additionally, on desktop, the context-level `startFresh` always forwards to `AudioManager.startFresh()` without the mobile engine guard that protects against redundant calls.

### Solution
Two targeted changes to prevent the restart:

**1. `AudioManager.startFresh()` in `src/audio/SoundscapeAudioManager.ts`**
- Save `currentTime` before calling `audio.play()`
- After play succeeds, verify `currentTime` wasn't reset and restore if needed
- This handles the edge case where the browser resets position during play

**2. `SoundscapeContext.startFresh()` in `src/context/SoundscapeContext.tsx`**
- Extend the mobile-only engine guard to also work on desktop: if the audio is already playing the same ambient track, skip calling `AudioManager.startFresh` entirely
- This is the simplest and most reliable fix -- no need to restart what's already playing

### Technical Details

**File: `src/context/SoundscapeContext.tsx`** (primary fix)
Change the `startFresh` callback to check if audio is already playing on ALL platforms, not just mobile:

```typescript
const startFresh = useCallback((initialVolume = DEFAULT_VOLUME) => {
  // If already playing the ambient track, do nothing (any platform)
  if (AudioManager.getIsPlaying() && !AudioManager.shouldLoadTrack('ambient')) {
    return;
  }
  AudioManager.startFresh(initialVolume);
  setVolumeState(initialVolume);
  previousVolumeRef.current = initialVolume;
}, []);
```

Note: `shouldLoadTrack('ambient')` returns `false` when the current track is already 'ambient' (meaning we should NOT reload). On desktop it always returns `true` currently, so we also add the `getIsPlaying()` check as a universal guard.

**File: `src/audio/SoundscapeAudioManager.ts`** (safety net)
In `startFresh()`, preserve currentTime across the `play()` call:

```typescript
export function startFresh(initialVolume = 0.05) {
  const audio = getAudio();
  
  if (!audio.paused && audio.src.includes('maxina-ambient-music')) {
    return; // Already playing, skip
  }
  if (userExplicitlyPaused) {
    return;
  }
  
  // Save position in case browser resets on play()
  const savedTime = audio.currentTime;
  
  soundscapeMuted = false;
  audio.muted = false;
  
  const savedVolume = localStorage.getItem('soundscape_volume');
  if (!savedVolume) {
    audio.volume = initialVolume;
  }
  
  audio.play()
    .then(() => {
      // Restore position if browser reset it
      if (savedTime > 1 && audio.currentTime < 1) {
        audio.currentTime = savedTime;
      }
      localStorage.setItem('soundscape_auto_play', 'true');
      notifyListeners();
    })
    .catch(err => {
      console.warn('[AudioManager] startFresh blocked:', err);
    });
}
```

Also update `shouldLoadTrack` to work on desktop too (remove the mobile-only guard):

```typescript
export function shouldLoadTrack(trackIdOrSrc: string): boolean {
  const audio = getAudio();
  if (trackIdOrSrc === currentTrackId) return false;
  if (audio.src && (audio.src === trackIdOrSrc || audio.src.includes(trackIdOrSrc))) return false;
  return true;
}
```

### Files to Edit
- `src/audio/SoundscapeAudioManager.ts` -- preserve currentTime in `startFresh`, make `shouldLoadTrack` universal
- `src/context/SoundscapeContext.tsx` -- add universal playing guard in `startFresh`
