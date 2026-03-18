

## Safety Analysis: Unmute Fix

The proposed change is **safe** and won't disrupt existing behavior. Here's why:

### What the change does

In `setMuted(false)` (line 497-501), replace the bare `audio.play()` with a check: if the audio element was never loaded (no `src` or `currentTime === 0`), call `startFresh()` instead. Otherwise, use the existing `audio.play()` path.

### Why it won't break anything

1. **`startFresh()` is already idempotent** — it has guards for "already playing" (line 733), "mid-session" (line 741), and "user explicitly paused" (line 750). Calling it from unmute won't cause double-plays or restarts.

2. **The mute guard in `startFresh()` (line 757) won't block** — `setMuted(false)` writes `localStorage('soundscape_muted', 'false')` on line 504 *before* `startFresh()` would read it on line 756, so it passes through correctly.

3. **Normal unmute (audio already loaded) is unchanged** — the `audio.play()` path still runs when the source is already loaded, which is the typical mid-session unmute case.

4. **No impact on**: mute persistence, logout/beforeunload cleanup, priority audio pausing, or volume controls.

### Change summary

| File | Change |
|------|--------|
| `src/audio/SoundscapeAudioManager.ts` | In `setMuted()` lines 497-501: when unmuting with no loaded source, call `startFresh()` instead of `audio.play()` |

This is a minimal, targeted fix — only the "unmute with uninitialized audio" code path is affected.

