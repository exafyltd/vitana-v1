

# Add transparent frosted background to ORB audio overlay

## Problem
The audio overlay renders with no background at all — just a faint radial gradient. The user expects the blurred, frosted-glass effect visible in screenshot 2 (content behind is visible but blurred).

## Change

**File: `src/components/audio/VitanaAudioOverlay.tsx`**

Add a frosted glass background to the main overlay container (line 252):

```tsx
className="fixed inset-0 z-[100] bg-background/10 backdrop-blur-xl"
```

This adds:
- `bg-background/10` — 10% opacity background tint (keeps it transparent)
- `backdrop-blur-xl` — strong blur of content behind (the frosted glass effect)

Single line change. The existing radial gradient overlay inside still renders on top for the subtle color wash.

