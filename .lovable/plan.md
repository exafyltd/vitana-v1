

## Fix: Background Music Plays Too Early + Duplicate Streams

### Issue 1: Music plays before entering Maxina

**Root cause**: `SoundscapeProvider` wraps the entire app (App.tsx line 299). On mount, it immediately:
1. Calls `AudioManager.initialize()` which creates the audio element
2. On desktop: calls `audioRef.current.play()` directly (line 85)
3. On mobile: calls `AudioManager.attemptMobileResume()` (line 99)

This happens on ANY page — the root `/`, `/auth`, login, intro experience — before the user has even reached Maxina. The music should only start playing when the user actually enters a Maxina-context page.

**Fix**: Remove the auto-play logic from `SoundscapeProvider`'s mount effect (lines 82-104). Instead, the provider should only initialize the AudioManager (create the singleton element, attach event listeners, restore saved preferences) but NOT call `.play()`. Playback should only start when explicitly triggered by:
- `startFresh()` called from `MaxinaPortal.tsx` or `IntroExperience.tsx` (already implemented, triggered on user interaction)
- The resume banner tap on mobile

Changes:
- **`src/context/SoundscapeContext.tsx` (lines 82-104)**: Remove the desktop auto-play block (`audioRef.current.play()`) and the mobile `attemptMobileResume()` call. Remove the `setPendingAutoPlay(true)` that sets up the "first interaction triggers play" listener. The audio element will still be created and configured (volume, track restored), but will remain paused until a Maxina-context page explicitly calls `startFresh()`.
- **`src/context/SoundscapeContext.tsx` (lines 126-162)**: Remove the `pendingAutoPlay` effect entirely. This effect adds a global click/touchstart listener that plays music on ANY user interaction anywhere in the app — which is why tapping login or navigating starts music prematurely.

---

### Issue 2: Two different background streams can play simultaneously

**Root cause**: There are two separate paths that can start the ambient audio, and they don't always coordinate:

1. **Race between provider auto-play and `startFresh()`**: The provider's mount effect calls `play()` immediately. Then when the user navigates to MaxinaPortal, `startFresh()` is called. If timing is unlucky, two play attempts overlap. The `startFresh` idempotent guard checks `audio.src.includes('maxina-ambient-music')` but if the first play hasn't resolved yet, the guard may not catch it.

2. **Stale `window.__SOUNDSCAPE_AUDIO__` reference**: The `getAudio()` function checks `window.__SOUNDSCAPE_AUDIO__` first (line 173). During HMR or certain reload scenarios, this reference can point to an old audio element while a new one is created, resulting in two elements with the same track both playing.

3. **`killOrphanedAudio` only runs on mute/volume-zero**: The orphan cleanup (SoundscapeContext lines 165-176) only runs when the user mutes or sets volume to 0. There's no proactive orphan check when starting playback.

**Fix**:

- **`src/audio/SoundscapeAudioManager.ts` — `getAudio()` (lines 171-271)**: When the window singleton exists, verify it's still valid (not detached, same src). If the window singleton is playing and we also have a different module-level `audioElement`, pause and dispose the duplicate. Add a comment explaining the invariant: there must never be two audio elements for the ambient track.

- **`src/audio/SoundscapeAudioManager.ts` — `startFresh()` (lines 697-751)**: Before starting playback, call a new `killDuplicateAudio()` helper that scans the DOM for any `<audio>` elements with `maxina-ambient-music` in their src that aren't the singleton, and destroys them. This is a safety net against any code path that creates duplicates.

- **`src/context/SoundscapeContext.tsx` — `startFresh` callback (lines 229-239)**: Before calling `AudioManager.startFresh()`, call `killOrphanedAudio()` proactively to clean up any stale elements from previous navigation.

---

### Summary of Changes

| File | What Changes | Why |
|------|-------------|-----|
| `SoundscapeContext.tsx` lines 82-104 | Remove auto-play on mount (both desktop and mobile) | Music should not start until user enters a Maxina-context page |
| `SoundscapeContext.tsx` lines 126-162 | Remove `pendingAutoPlay` interaction listener effect | Prevents any-tap-starts-music behavior on non-Maxina pages |
| `SoundscapeContext.tsx` lines 229-239 | Add `killOrphanedAudio()` call before `startFresh` | Clean up stale elements before starting playback |
| `SoundscapeAudioManager.ts` lines 171-176 | Validate window singleton, dispose duplicates in `getAudio()` | Prevent stale HMR references from creating two players |
| `SoundscapeAudioManager.ts` lines 697-751 | Add duplicate cleanup at start of `startFresh()` | Safety net: scan DOM and destroy duplicate ambient audio elements |

### What This Achieves

- Music stays silent on `/`, `/auth`, login, and all non-Maxina pages
- Music only starts when `startFresh()` is explicitly called (MaxinaPortal, IntroExperience)
- At any given time, only one audio element for the ambient track can exist
- The memory note about "music must auto-start on every app launch" is preserved — `startFresh()` on MaxinaPortal entry is the auto-start trigger, just scoped to the right context

