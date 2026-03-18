

# Persist Soundscape Mute Across Sessions

## Problem

The mute state is explicitly reset on every app load. There are **four locations** that force `soundscapeMuted = false`:

1. **`SoundscapeAudioManager.ts` line 242** — `getAudio()`: "Always start unmuted on fresh launch"
2. **`SoundscapeAudioManager.ts` line 298** — `initialize()`: "Always start unmuted on each boot"
3. **`SoundscapeAudioManager.ts` lines 755-761** — `startFresh()`: "Don't check saved mute" + forces `soundscapeMuted = false`
4. **`SoundscapeContext.tsx` line 58** — Comment: "Don't restore muted state from storage"

Meanwhile, `setMuted()` (line 504) already saves to `localStorage.setItem('soundscape_muted', ...)` — so the value IS persisted, it's just never read back.

## Plan

### 1. `SoundscapeAudioManager.ts` — Respect persisted mute on boot

**In `getAudio()` (line 240-242)**: Instead of forcing unmuted, read the saved value:
```ts
// Restore mute preference from localStorage (persists across sessions)
const savedMuted = localStorage.getItem('soundscape_muted');
soundscapeMuted = savedMuted === 'true';
audio.muted = soundscapeMuted;
```

**In `initialize()` (line 297-298)**: Same — read instead of reset:
```ts
const savedMuted = localStorage.getItem('soundscape_muted');
soundscapeMuted = savedMuted === 'true';
```

**In `startFresh()` (lines 749-761)**: Add a mute guard before playback and remove the forced reset:
```ts
// If user has muted soundscape (persisted), don't auto-start
if (soundscapeMuted) {
  console.log('[AudioManager] startFresh skipped - soundscape is muted');
  return;
}
// (remove lines 755, 760-761 that force soundscapeMuted = false)
```

### 2. `SoundscapeContext.tsx` — Restore mute state on mount

**Line 58**: Replace the "don't restore" comment block with actual restoration:
```ts
if (savedMuted === 'true') {
  setIsMuted(true);
}
```

### 3. `SoundscapeAudioManager.ts` — `attemptMobileResume()` already checks `soundscapeMuted`

Line 599 already skips resume when muted — this will now work correctly since `soundscapeMuted` will be `true` from boot.

## Files to modify

| File | Change |
|------|--------|
| `src/audio/SoundscapeAudioManager.ts` | Read `soundscape_muted` from localStorage in `getAudio()`, `initialize()`, and `startFresh()` instead of forcing false |
| `src/context/SoundscapeContext.tsx` | Restore `isMuted` from `savedMuted` on mount |

## What this achieves

- Mute/unmute toggle persists across refresh, logout/login, app restart
- Only user action (clicking unmute) reactivates Soundscape
- No other behavior changes — volume, track position, priority audio all work as before

