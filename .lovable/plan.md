

# Stop Soundscape on Logout

## Problem
When the user logs out, Soundscape continues playing in the background. The audio element remains active even after sign-out, persisting across the phone's other apps. Expected behavior: logout stops playback, and next login resumes it (since the user never explicitly muted).

## Approach
Since `AppHooksInitializer` is rendered inside `SoundscapeProvider`, it can use `useSoundscape()`. We already watch `user?.id` there — when it becomes `null` (logout), we call `pause()` from the Soundscape context to stop playback without changing the persisted mute state.

On next login, `startFresh()` is called from Maxina-context pages, which already checks the persisted mute state and resumes if not muted. So no changes needed for the resume path.

## Changes

### `src/App.tsx` — `AppHooksInitializer`

1. Import `useSoundscape` from `@/context/SoundscapeContext`
2. Destructure `pause` from `useSoundscape()`
3. In the existing `useEffect` that watches `user?.id` (the Appilix identity one), add a call to `pause()` in the `else` branch (user logged out), alongside the identity cleanup
4. Also call `killOrphanedAudio` logic via `AudioManager.pause()` to ensure the audio element is fully stopped — but since `pause` from context already calls `AudioManager.pause()`, just calling the context's `pause()` is sufficient

Specifically, in the `else` block (lines 325-331), add:

```ts
} else {
  // Stop soundscape on logout (don't change mute preference)
  pause();
  
  // Clear Appilix identity...
}
```

This stops playback without altering `localStorage` mute state, so on next login `startFresh()` will resume normally.

| File | Change |
|------|--------|
| `src/App.tsx` | Import `useSoundscape`, call `pause()` on logout in `AppHooksInitializer` |

