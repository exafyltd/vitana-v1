

## Problem

On iPhone (iOS Safari), the Soundscape background music does not auto-start when the intro screen loads. The user must tap the screen before music begins. This is caused by **iOS Safari's autoplay policy**: audio cannot play without a prior user gesture — there is no workaround for this browser restriction.

Currently, the code explicitly avoids auto-starting soundscape on mount (line 78-80 of `IntroExperience.tsx`), and instead attaches `ensureSoundscapePlaying` to a generic `onClick` on the content wrapper (line 247). This means the user has to tap *somewhere* before the music kicks in, which feels broken.

## What we can do

Since we **cannot bypass iOS autoplay restrictions**, the best approach is to make the first meaningful interaction start the music seamlessly, so it *feels* automatic:

### 1. Auto-start soundscape on first touch/scroll (not just click)

Add a **one-shot `touchstart` listener** to the intro page that calls `startFresh()`. On iOS, `touchstart` counts as a user gesture and fires the instant a finger touches the glass — before any visible UI interaction. This makes the music start the moment the user touches the screen, which feels nearly automatic.

**File:** `src/pages/IntroExperience.tsx`

Add a `useEffect` that registers a one-time `touchstart` + `click` listener on the document:

```typescript
useEffect(() => {
  const startOnFirstTouch = () => {
    startFresh();
    document.removeEventListener('touchstart', startOnFirstTouch);
    document.removeEventListener('click', startOnFirstTouch);
  };
  document.addEventListener('touchstart', startOnFirstTouch, { once: true });
  document.addEventListener('click', startOnFirstTouch, { once: true });
  return () => {
    document.removeEventListener('touchstart', startOnFirstTouch);
    document.removeEventListener('click', startOnFirstTouch);
  };
}, [startFresh]);
```

### 2. Attempt autoplay optimistically (works on Android/desktop, silently fails on iOS)

Also call `startFresh()` on mount inside a try/catch. On desktop and Android this will succeed immediately. On iOS it will fail silently, and the touchstart listener from step 1 will handle it.

**File:** `src/pages/IntroExperience.tsx`

Replace the comment block at lines 78-80 with:

```typescript
useEffect(() => {
  // Attempt autoplay — succeeds on desktop/Android, silently blocked on iOS
  startFresh();
}, [startFresh]);
```

### 3. Remove redundant onClick from content wrapper

The generic `onClick={ensureSoundscapePlaying}` on the content div (line 247) becomes unnecessary since the one-shot listener handles it. Remove it to avoid double-triggering.

## Summary

| Change | File |
|--------|------|
| Add one-shot `touchstart`/`click` listener for instant music start | `IntroExperience.tsx` |
| Attempt optimistic autoplay on mount | `IntroExperience.tsx` |
| Remove redundant `onClick` from content wrapper | `IntroExperience.tsx` |

This makes music start instantly on desktop/Android, and on iOS it starts the very first time the user touches the screen — before they even lift their finger.

