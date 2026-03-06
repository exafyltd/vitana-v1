

## Remove Desktop Navigation Arrows from Event Drawer

The screenshot shows the drawer on desktop with left/right navigation arrows (‹ ›) flanking the hero image. These should be removed — the kebab menu (already at `top-4 right-14`) is the only control needed in the top area.

### Changes

**`src/components/meetups/MeetupDetailsDrawer.tsx`**

1. **Remove the desktop navigation arrows block** (lines 853-891) — the `{!isMobile && ...}` block containing the `ChevronLeft`/`ChevronRight` buttons
2. **Keep keyboard navigation** — the `ArrowLeft`/`ArrowRight` key handlers (lines 415-420) can stay for power users, or be removed too since there's no visual affordance anymore
3. **Clean up unused imports** — remove `ChevronLeft` and `ChevronRight` from lucide imports if no longer used elsewhere in the file

The kebab menu stays as-is at `top-4 right-14`.

