

## Soundscape Mute Persistence Fix

### Problem
The mute state is saved to `localStorage` (`soundscape_muted`) but explicitly **ignored** on reload/revisit in two places:

1. **`SoundscapeContext.tsx` line 58**: Comment says "Don't restore muted state from storage — always start unmuted on each visit"
2. **`SoundscapeAudioManager.ts` line 755-761**: `startFresh()` has a comment "Don't check saved mute — each visit starts fresh with music" and force-resets `soundscapeMuted = false`

So the mute toggle writes to localStorage correctly, but the value is never read back.

### Changes

**File 1: `src/context/SoundscapeContext.tsx`**
- Lines 58-59: Replace the "don't restore" comment with actual restoration of saved mute state from `localStorage('soundscape_muted')`. If `'true'`, set `isMuted(true)` and apply to the audio element.

**File 2: `src/audio/SoundscapeAudioManager.ts`**
- Lines 749-761 in `startFresh()`: After the `userExplicitlyPaused` guard, add a guard that checks `localStorage.getItem('soundscape_muted') === 'true'`. If muted, skip playback and return early. Remove the lines that force-reset `soundscapeMuted = false` and `audio.muted = false`.

### Behavior after fix
- User mutes Soundscape → saved to localStorage
- Page refresh / app reopen / new login → mute state restored, Soundscape stays silent
- User unmutes → localStorage cleared, `startFresh()` proceeds normally on next visit
- No other flows affected (priority audio pausing, volume persistence, orphan cleanup all unchanged)

