

# Fix: Page scroll shift after closing event detail drawer on mobile

## Problem

When the mobile event detail Sheet (Radix Dialog) opens, it sets `overflow: hidden` on `document.body` to prevent background scrolling. This causes the browser to lose the current scroll position. When the Sheet closes, `overflow` is restored but the scroll position is not — resulting in the page appearing shifted upward (as seen in screenshot 2).

## Fix

Add scroll position save/restore logic in `MeetupDetailsDrawer.tsx`. When the Sheet opens on mobile, capture `window.scrollY`. When it closes, restore it.

### `src/components/meetups/MeetupDetailsDrawer.tsx`

Add a `useEffect` that watches the `open` prop:

```ts
const scrollYRef = useRef(0);

useEffect(() => {
  if (!isMobile) return;
  
  if (open) {
    // Save scroll position before dialog locks the body
    scrollYRef.current = window.scrollY;
  } else {
    // Restore scroll position after dialog unlocks
    const savedY = scrollYRef.current;
    requestAnimationFrame(() => {
      window.scrollTo(0, savedY);
    });
  }
}, [open, isMobile]);
```

## Scope

**1 file**, **~10 lines added** — `src/components/meetups/MeetupDetailsDrawer.tsx`. No other files affected.

