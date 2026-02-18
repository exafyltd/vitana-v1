

## Refine MAXINA Title Styling in Top App Bar

### Change

Update the Maxina-specific branch of the tenant name `<span>` in `src/components/mobile/TopAppBar.tsx` (line 57) to match the requested styling:

- `text-[22px]` → `text-[21px]`
- `tracking-[0.24em]` → `tracking-[0.18em]`
- Add `text-white/[0.92]` (currently inherits `rgba(255,255,255,0.95)` from parent)

Everything else stays the same: bar height (`h-8`), vertical alignment (`items-center`, `leading-none`), gradient, structure, and non-Maxina tenant styling.

### Technical detail

Line 57 class string for the `isMaxina` branch changes from:

```
font-medium tracking-[0.24em] text-[22px]
```

to:

```
font-medium tracking-[0.18em] text-[21px] text-white/[0.92]
```

**File edited:** `src/components/mobile/TopAppBar.tsx` (single line change).

