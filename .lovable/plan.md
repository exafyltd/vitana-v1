

## Update MAXINA App Bar Typography

### Problem
The current tenant name in the app bar uses `font-semibold` (600) and `tracking-[0.08em]` at `text-[20px]`. The desired Maxina style requires `font-medium` (500) with wider letter-spacing (`0.24em`) at `22px`.

### Change

**`src/components/mobile/TopAppBar.tsx`** -- line 57

Current:
```
className="absolute left-1/2 -translate-x-1/2 z-10 font-semibold tracking-[0.08em] text-[20px] select-none"
```

Updated (Maxina-conditional):
- When `isMaxina`: `font-medium tracking-[0.24em] text-[22px]`
- When not Maxina: keep existing `font-semibold tracking-[0.08em] text-[20px]`

The `leading-none` utility will be added to prevent the 2px font-size increase from affecting the container's `h-8` height.

### What stays unchanged
- App bar height (`h-8` / 32px)
- Gradient background and color
- Mute button and menu button
- Non-Maxina tenant styling

