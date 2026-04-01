

# Fix: Dock CTA bar flush to bottom edge

## Problem
The "Buy Ticket" action bar has a visible white gap beneath it on mobile (especially Android). Two causes:

1. **`100dvh` vs `100lvh`**: The sheet uses `!h-[100dvh]` which excludes the system navigation bar area on Android. Should use `!h-[100lvh]` to extend behind it (per existing architectural memory).
2. **Excessive bottom padding**: The CTA bar has `paddingBottom: calc(env(safe-area-inset-bottom, 0px) + 16px)` — the extra 16px creates unnecessary white space beneath the buttons. Reduce to just `env(safe-area-inset-bottom, 0px) + 4px` for a tight dock feel.
3. **Background sync**: Add a `useEffect` to set `document.documentElement.style.backgroundColor` to match the CTA bar background while the drawer is open, preventing any flash of white behind system bars.

## Changes — single file: `src/components/meetups/MeetupDetailsDrawer.tsx`

### 1. Sheet height (line 1737)
Change `!h-[100dvh]` to `!h-[100lvh]` so the sheet extends behind Android system navigation.

### 2. CTA bottom padding (line 1366)
Change from:
```
paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)'
```
To:
```
paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)'
```
This keeps safe-area respect but eliminates the extra white band.

### 3. Background color sync
Add a `useEffect` near existing effects that, when `open && isMobile`, sets `document.documentElement.style.backgroundColor` to the CTA bar's background color (`rgb(240, 240, 240)` or `hsl(var(--background))`), and resets on cleanup. This prevents any white band showing through behind system bars.

