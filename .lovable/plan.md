

## Plan: Pause Soundscape on Logout and App Exit

### Problem
Soundscape keeps playing when:
1. User logs out (signOut clears session but nothing stops the audio)
2. User exits/closes the app (page unload, no cleanup)

### Solution

**File: `src/context/SoundscapeContext.tsx`** — Add two effects:

**1. Pause on logout (user becomes null)**
Add `useAuth()` and an effect watching `user`:
```ts
const { user } = useAuth();

useEffect(() => {
  if (!user) {
    console.log('[SoundscapeProvider] User logged out, pausing Soundscape');
    AudioManager.pause();
    setIsPlaying(false);
  }
}, [user]);
```

**2. Pause on app exit (beforeunload)**
Add a `beforeunload` listener inside the existing mount effect:
```ts
const handleBeforeUnload = () => {
  AudioManager.pause();
};
window.addEventListener('beforeunload', handleBeforeUnload);

// In cleanup:
window.removeEventListener('beforeunload', handleBeforeUnload);
```

### Why this is safe
- On logout: audio stops, but `soundscape_muted` preference in localStorage is untouched — next login respects it
- On app close: audio stops immediately; on reopen, `startFresh()` is called from MaxinaPortal which checks the muted preference before playing
- No impact on mute/unmute toggle, priority audio pausing, or route transitions

### Files modified
| File | Change |
|------|--------|
| `src/context/SoundscapeContext.tsx` | Import `useAuth`, add logout-pause effect, add `beforeunload` listener |

