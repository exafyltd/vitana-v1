

# Fix: Scroll position still shifting after closing event drawer

## Root cause

The current `requestAnimationFrame` fires too early — the Radix Sheet close animation takes 300ms, and the body `overflow: hidden` / scroll position reset hasn't fully resolved by the time `rAF` executes. The browser's scroll position is still locked when the restore fires.

## Fix

Replace the single `requestAnimationFrame` with a more robust approach: use a `setTimeout` matching the Sheet's close animation duration (300ms per the `data-[state=closed]:duration-300` class), then restore scroll position. Also add a fallback double-`rAF` after the timeout to ensure layout has settled.

### `src/components/meetups/MeetupDetailsDrawer.tsx` — lines 218–228

**Current:**
```ts
useEffect(() => {
  if (!isMobile) return;
  if (open) {
    scrollYRef.current = window.scrollY;
  } else {
    const savedY = scrollYRef.current;
    requestAnimationFrame(() => {
      window.scrollTo(0, savedY);
    });
  }
}, [open, isMobile]);
```

**Replace with:**
```ts
useEffect(() => {
  if (!isMobile) return;
  if (open) {
    scrollYRef.current = window.scrollY;
  } else {
    const savedY = scrollYRef.current;
    // Wait for Sheet close animation (300ms) + body overflow restore
    const timer = setTimeout(() => {
      window.scrollTo(0, savedY);
      // Fallback: another rAF in case layout hasn't settled
      requestAnimationFrame(() => {
        window.scrollTo(0, savedY);
      });
    }, 350);
    return () => clearTimeout(timer);
  }
}, [open, isMobile]);
```

## Scope

Same file, same block — just changing the timing strategy from a single `rAF` to a 350ms timeout with cleanup.

