

## Fix: Mobile Soundscape Auto-Play on Every Launch

### Problem

On mobile, the SoundscapeContext delegates auto-play to `AudioManager.attemptMobileResume()`. But that function was designed for **resuming** after a background/tab switch -- it checks localStorage for `wasPlaying === 'true'` and `savedMuted !== 'true'`. On a first visit (or after clearing storage), both checks fail, so **no music plays on mobile**.

### Changes

**File: `src/audio/SoundscapeAudioManager.ts`**

**Change 1 -- `attemptMobileResume()` (line 578-584):**
Remove the `savedMuted` check and change the `wasPlaying` check so it defaults to playing when no preference exists:

```tsx
// Before:
const savedMuted = localStorage.getItem('soundscape_muted');
if (savedMuted === 'true' || wasPlaying !== 'true') {
  return;
}

// After:
// Skip only if foreground media is active (mute is session-only, handled in-memory)
if (soundscapeMuted) {
  console.log('[AudioManager] Mobile resume skipped: muted this session');
  return;
}
```

This means:
- First launch (no localStorage): music plays
- Returning after background (wasPlaying saved): music plays
- User muted this session (in-memory flag): music stays muted
- Foreground media active: still respected (existing check on line 587)

**File: `src/context/SoundscapeContext.tsx`**

**Change 2 -- Mobile path (lines 96-101):**
Instead of only calling `attemptMobileResume()` (which is meant for resume-from-background), also set `pendingAutoPlay` on mobile so the first user tap triggers playback if autoplay is blocked:

```tsx
} else {
  // Mobile: attempt play, fall back to interaction-triggered play
  AudioManager.attemptMobileResume();
  // If autoplay is blocked, allow first-interaction trigger (don't skip mobile)
  setPendingAutoPlay(true);
}
```

**Change 3 -- Remove mobile skip in interaction handler (lines 128-133):**
Currently the pending-auto-play interaction handler returns early on mobile, leaving it solely to the resume banner. Remove this early return so that a tap anywhere on the page also starts playback on mobile (better UX than requiring the banner):

```tsx
// Remove this block:
const isMobileUA = ...;
const isNarrowViewport = ...;
if (isMobileUA || isNarrowViewport) {
  return;
}
```

### What Stays the Same
- Resume banner still works for background-to-foreground transitions
- Volume is still remembered
- Priority media still pauses Soundscape
- Desktop behavior unchanged

### Files Changed

| File | Change |
|------|--------|
| `src/audio/SoundscapeAudioManager.ts` | Use in-memory `soundscapeMuted` instead of localStorage checks in `attemptMobileResume()` |
| `src/context/SoundscapeContext.tsx` | Enable interaction-triggered auto-play on mobile; remove mobile early-return in interaction handler |

