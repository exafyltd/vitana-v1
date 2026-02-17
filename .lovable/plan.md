

## Always Start With Music on Every App Launch

### Desired Behavior
- Every time the app opens, background music (Soundscape) starts playing automatically
- Pressing Mute stops it for the current session only
- On the next visit, music starts fresh again (mute is not remembered across sessions)
- Other media (videos, audio player, Orb) still take priority and pause the Soundscape as before

### Changes

**File: `src/context/SoundscapeContext.tsx`**

1. **Always attempt auto-play on mount** (line 83): Remove the `savedAutoPlay === 'true'` and `savedMuted !== 'true'` guards. The music should always try to play when the provider initializes, regardless of what was saved from a previous session.

2. **Clear muted state on boot** (around line 58): Remove or skip the `if (savedMuted === 'true') setIsMuted(true)` block so the app always starts unmuted.

**File: `src/audio/SoundscapeAudioManager.ts`**

3. **Don't persist mute across sessions** (line 478): In `setMuted()`, remove the line `localStorage.setItem('soundscape_auto_play', 'false')` so muting doesn't disable auto-play for the next visit.

4. **Reset muted state on initialize** (line 280): In `initialize()`, force `soundscapeMuted = false` instead of reading from localStorage, so each boot starts unmuted.

5. **Mobile restore: ignore saved muted state** (lines 219-223): In `getAudio()`, skip restoring `soundscapeMuted = true` from mobile localStorage so mobile also starts fresh.

### What Stays the Same
- Volume level is still remembered across sessions
- Priority audio (media player, Orb, videos) still pauses Soundscape
- The mute button works normally during a session
- Mobile resume banner behavior unchanged

### Files Changed

| File | Change |
|------|--------|
| `src/context/SoundscapeContext.tsx` | Always auto-play on mount; don't restore muted state from storage |
| `src/audio/SoundscapeAudioManager.ts` | Reset muted on boot; don't save auto-play=false on mute; skip mobile muted restore |

