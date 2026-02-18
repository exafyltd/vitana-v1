

## Extend App Bar Gradient Into Status Bar + Enlarge "MAXINA" Title

### Overview

Three targeted changes to make the Top App Bar feel fully native and immersive:

1. Extend the gradient behind the system status bar (time, battery) using safe-area insets
2. Tell Appilix to make the native status bar transparent with light (white) icons
3. Increase the "MAXINA" title size from `text-sm` to `text-[22px]` with proper letter-spacing

### Changes

**1. `src/components/mobile/TopAppBar.tsx`**

Restructure the header to include safe-area padding above the toolbar row:

- Outer `<header>` remains `fixed top-0 left-0 right-0 z-40` but removes the fixed `h-14`
- Add `padding-top: env(safe-area-inset-top, 0px)` so the gradient fills behind the status bar
- The inner toolbar row keeps `h-14` for the kebab + title
- The gradient background covers both the safe-area region and the toolbar
- For non-Maxina tenants, the neutral background also extends behind the status bar

Title upgrade:
- Change from `text-sm font-semibold tracking-wider` to `text-[22px] font-semibold tracking-[0.08em]`
- Keep white at 0.95 opacity for Maxina

**2. `src/lib/appilix.ts`**

Add a new `setStatusBarStyle()` helper:

```
export function setStatusBarStyle(background: string, lightContent: boolean): boolean {
  return updateSettings({
    status_bar_color: background,
    status_bar_style: lightContent ? 'light-content' : 'dark-content',
  });
}
```

**3. `src/hooks/useAppilix.ts`**

After calling `hideAppilixAppBar()`, also call `setStatusBarStyle('transparent', true)` for Maxina tenant, or `setStatusBarStyle('#8FD5FA', true)` as fallback if transparent is not supported.

**4. `src/components/mobile/MobileAppShell.tsx`**

Update the content padding from `pt-14` to account for the safe-area inset:
- Change to `padding-top: calc(env(safe-area-inset-top, 0px) + 56px)` (safe area + h-14)

**5. `src/components/audio/MobileMuteButton.tsx`**

Update top offset to also account for safe-area:
- Change from `top-[60px]` to inline style `top: calc(env(safe-area-inset-top, 0px) + 60px)`

### What Stays Unchanged

- Drawer sidebar (no changes)
- Bottom navigation (no changes)
- Desktop layout (no changes)
- Carousel height calculations (already correct relative to the shell padding)

