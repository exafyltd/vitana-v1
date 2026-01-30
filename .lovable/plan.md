
## Fix Hero Title Position and Reduce Bottom Sticky Bar

### Issue 1: Title Still Appears Cut Off

**Root Cause Analysis:**

The title overlay uses `bottom-0` positioning, meaning content stacks from the bottom up. The `mt-2` margin added above the title doesn't help because:
- The container is anchored to `bottom-0`
- Content flows upward from the bottom
- Top margin just creates space above, but doesn't shift the visual anchor

**Solution:**

Instead of adding top margin to the title, we need to add padding to the TOP of the overlay container itself. Since the overlay uses `bottom-0` and has a gradient, adding `pt-16` or `pt-20` will push the entire content block (title + host bar + follow button) down within the visible hero area.

```text
CURRENT:                        FIXED:
+------------------------+      +------------------------+
| [X]                    |      | [X]                    |
| Evening of Stillness   | <-   |                        |
|   – Sound Bath         |      |                        |
| [Host] [Follow]        |      | Evening of Stillness   |
+------------------------+      |   – Sound Bath         |
                                | [Host] [Follow]        |
                                +------------------------+
```

**File Change - MeetupDetailsDrawer.tsx (lines 693-696):**

```tsx
// BEFORE
<div className={cn(
  "absolute left-0 right-0 p-6",
  isMobile ? "bottom-0 pt-12" : "bottom-0"
)}>

// AFTER
<div className={cn(
  "absolute left-0 right-0 p-6",
  isMobile ? "bottom-0 pt-20" : "bottom-0"
)}>
```

Wait - this still won't work because `bottom-0` anchors to bottom and `pt-X` expands upward, not downward.

**Correct Approach:**

The overlay is at `bottom-0`. To move content DOWN (lower on screen), we need to:
1. Position the overlay from the TOP instead, OR
2. Add bottom padding to push content up (but we want DOWN), OR
3. Use `top-X` with `bottom-0` to create vertical centering space

Actually, looking at the visual - the hero uses `aspect-video` and the title overlay covers the entire hero with `bottom-0`. The content inside flows from top-down due to flexbox default. Adding `mt-X` to the first child (h2) SHOULD push it down.

Let me reconsider: The issue might be that `pt-12` on the container is working, but we reverted it OR the value isn't large enough. Looking at the code, we currently have:
- Container: `pt-12` on mobile
- Title: `mt-2` on mobile

The `mt-2` (8px) is very small. Let's increase both values significantly:
- Container: `pt-16` (64px)  
- Title: `mt-4` (16px)

This combined 80px should visibly shift the content lower.

---

### Issue 2: Bottom Sticky Bar Too Tall with Empty Space

**Current Code (line 1151):**
```tsx
<div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t shadow-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
  <div className="flex items-center gap-2">
```

**Problems:**
1. `p-4` (16px all around) + `pb-[max(1rem,...)]` creates excessive vertical space
2. Buttons use `h-12` (48px) which is quite tall
3. The flex container isn't centered horizontally

**Solution:**
1. Reduce padding: `p-3` instead of `p-4`
2. Reduce button heights on mobile: `h-11` instead of `h-12`
3. Center the button group with `justify-center`

**File Change - MeetupDetailsDrawer.tsx (line 1151):**

```tsx
// BEFORE
<div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t shadow-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
  <div className="flex items-center gap-2">

// AFTER
<div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t shadow-lg px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
  <div className="flex items-center justify-center gap-2">
```

Also reduce button heights on mobile (lines 1158-1165, 1265, 1290, 1326, 1345):
- Change `h-12` to `h-10` for all CTA buttons on mobile

---

### Summary of Changes

| File | Line | Change |
|------|------|--------|
| `MeetupDetailsDrawer.tsx` | 693-696 | Increase container padding: `pt-12` to `pt-16` |
| `MeetupDetailsDrawer.tsx` | 697-700 | Increase title margin: `mt-2` to `mt-4` |
| `MeetupDetailsDrawer.tsx` | 1151 | Reduce sticky bar padding: `p-4` to `px-3 py-2`, reduce safe-area min |
| `MeetupDetailsDrawer.tsx` | 1152 | Center buttons: add `justify-center` |
| `MeetupDetailsDrawer.tsx` | 1158-1165 | Reduce CTA button height: `h-12` to `h-10` on mobile |
| `MeetupDetailsDrawer.tsx` | 1265, 1290, 1326, 1345 | Reduce icon button heights: `h-12 w-12` to `h-10 w-10` |

---

### Visual Result

After these changes:
- Title will be noticeably lower in the hero area (no cut-off appearance)
- Bottom sticky bar will be more compact
- CTA buttons will be centered with less empty white space
- Overall more polished mobile experience
