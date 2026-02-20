
## Fix: Seamless Soundscape Across Intro → Sign-In Navigation

### Root Cause

When navigating from `IntroExperience` to `MaxinaPortal` (via `navigate(`/${tenantSlug}`)`, which lands on `/maxina`), the `SoundscapeProvider` is **not unmounted** — it lives at the app root level in `App.tsx` and wraps all routes. So the provider itself stays mounted.

The restart happens because of **two compounding issues**:

**Issue 1 — `SoundscapeProvider` init effect re-runs during navigation**

The provider's `useEffect` (line 39, `SoundscapeContext.tsx`) has an empty dependency array `[]` so it only runs on mount. This is fine. BUT: on the IntroExperience page, `continueToMaxina()` calls `navigate(/${tenantSlug}, { replace: true })` with an 800ms fade delay. During this window, `IntroExperience` calls `setVolume(0.04)` in a cleanup because `isPlayingAudio` becomes false (audio ended → `continueToMaxina()` is called). This is harmless.

**Issue 2 — `startFresh()` is called on MaxinaPortal mount and its guard fails when audio is briefly paused**

In `MaxinaPortal.tsx`, the page renders `<Card onClick={ensureSoundscapePlaying}>` and input fields with `onFocus={ensureSoundscapePlaying}`. Neither of these auto-fires on mount, so `startFresh` is not called automatically.

**The actual restart trigger** is in `SoundscapeContext.tsx` lines 82–103. The provider's init effect checks `if (audioRef.current.paused)` and calls `audioRef.current.play()`. Since the provider only mounts once, this does NOT re-run on route change.

**After deeper analysis, the real problem is `startFresh` in AudioManager:**

In `SoundscapeAudioManager.ts` line 687–729, `startFresh()` does:
```typescript
const savedTime = audio.currentTime;  // capture position
// ...
audio.play()
  .then(() => {
    // Restore position if browser reset it during play()
    if (savedTime > 1 && audio.currentTime < 1) {
      audio.currentTime = savedTime;
    }
  })
```

The guard on line 691 is:
```typescript
if (!audio.paused && audio.src.includes('maxina-ambient-music')) { return; }
```

This guard only fires if the audio is **not paused**. But `IntroExperience` calls `setVolume(0.015)` when TTS plays (lines 83–89), and the `GlobalMediaPrecedence` hook in `SoundscapeProvider` has a `handleGlobalPlay` listener. When the TTS `<audio>` element plays (it's a raw `new Audio(...)` — **not** the soundscape element), it fires a `play` event that gets caught by the global listener, which calls `pauseForForeground()`. This **pauses** the soundscape.

Then when TTS ends → `continueToMaxina()` → `handleGlobalPauseOrEnd` fires → `resumeAfterForeground()` plays soundscape. So far so good.

But when `navigate()` fires, `MaxinaPortal` mounts. Its `ensureSoundscapePlaying` is wired to `onClick`/`onFocus` on form elements. On **mobile**, when the page loads, the browser sometimes auto-focuses the email input, triggering `onFocus={ensureSoundscapePlaying}` which calls `startFresh()`.

`startFresh` then runs `audio.play()` on an element that is **already playing** from the `resumeAfterForeground()` call. The browser handles this by restarting the audio from `currentTime` — but `savedTime` was captured **before** `audio.play()` was called, and if the audio engine resets `currentTime` to 0 during the `.play()` promise resolution, the restore logic triggers and seeks back to the saved position. This seek + restart is what the user perceives as a "restart".

**Additionally:** The `shouldLoadTrack('ambient')` guard in `SoundscapeContext.startFresh` (line 231) calls `AudioManager.shouldLoadTrack('ambient')`. This returns `false` (meaning "same track, skip") — but the guard logic is inverted: it checks `!AudioManager.shouldLoadTrack('ambient')`. When `shouldLoadTrack` returns `false` (same track), `!false = true`, meaning the guard expression `getIsPlaying() && !shouldLoadTrack()` is `true && true = true` → skips correctly. 

Wait — re-reading: if audio IS playing AND same track → `getIsPlaying()=true`, `shouldLoadTrack=false`, `!false=true` → `true && true` → skip. That's correct.

**So the actual failure mode**: `startFresh` is being called when audio is **already playing** via `resumeAfterForeground()` but `getIsPlaying()` might briefly return `false` between the `pause()` and `play()` calls in `resumeAfterForeground()`. This race condition means the guard misses, `audio.play()` is called again from scratch, resetting `currentTime`.

### The Fix

**Single file change: `src/audio/SoundscapeAudioManager.ts`**

The `startFresh` guard needs to be strengthened. Currently it only checks `!audio.paused`. It should also guard against the case where the audio is **currently in the process of resuming** (i.e., `currentlyPausedByForeground = false` but audio may still be transitioning). 

The simplest and most reliable fix: also guard `startFresh` when the audio `src` is already set to the ambient track, regardless of paused state — because calling `play()` on an already-loaded-and-positioned audio element will reset `currentTime` if the browser buffers, which is the root restart.

**Change in `startFresh()`**: Add a second guard — if the src is already the ambient track AND `currentTime > 0`, the audio is mid-playback (even if briefly paused for foreground). In that case, just call `audio.play()` directly to resume without resetting, instead of going through the full `startFresh` initialization flow:

```typescript
export function startFresh(initialVolume = 0.05) {
  const audio = getAudio();
  
  // IDEMPOTENT guard 1: Already playing the ambient track → do nothing
  if (!audio.paused && audio.src.includes('maxina-ambient-music')) {
    console.log('[AudioManager] startFresh skipped - already playing');
    return;
  }
  
  // NEW guard 2: Audio is mid-session (has position) → just resume, don't reinitialize
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
  
  // ... rest of existing logic unchanged
```

This guard catches the exact failure: audio is briefly paused (during foreground transition) but has `currentTime > 0.5`, meaning it's mid-playback. Instead of calling the full initialization flow (which captures `savedTime`, calls `play()`, and then conditionally seeks — introducing a stutter), it simply resumes in place with a clean `audio.play()`.

### Why 0.5 seconds threshold?

A brand-new audio element starts at `currentTime = 0`. After 0.5 seconds of playback, it's clearly mid-session. This threshold is conservative and prevents false positives on initial load.

### Files to Edit
- `src/audio/SoundscapeAudioManager.ts` — add one guard block inside `startFresh()` (5 lines)
