

## Fix: Mute icon not reflecting persisted mute state

### Problem
In `SoundscapeContext.tsx`, the initialization effect correctly restores `isMuted = true` from localStorage (line 59-62), but then immediately overwrites it on line 76 with `AudioManager.getState().isMuted`, which defaults to `false`. The TopAppBar reads `isMuted` from context, so it shows the wrong icon.

### Fix

**File: `src/context/SoundscapeContext.tsx` (line 76)**

Skip overwriting `isMuted` from AudioManager state if we already restored it from localStorage:

```ts
// Line 76: only sync isMuted from manager if we didn't already restore from localStorage
if (savedMuted !== 'true') {
  setIsMuted(state.isMuted);
}
```

Same logic should apply to the subscriber callback (line 69) — it should not override a persisted mute. We gate the `setIsMuted` call in the subscribe handler so it doesn't reset the muted state when AudioManager emits its initial state:

```ts
const unsubscribe = AudioManager.subscribe((state) => {
  setIsPlaying(state.isPlaying);
  setVolumeState(state.volume);
  // Don't let AudioManager override persisted mute preference
  if (localStorage.getItem('soundscape_muted') !== 'true') {
    setIsMuted(state.isMuted);
  }
});
```

This is a two-line change in one file. The TopAppBar and SoundscapeControl already read `isMuted` correctly from context — they just need the right value.

