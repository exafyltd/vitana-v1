

# Fix: Consistent large hero image in event detail drawer

## What's happening

The hero image container on mobile uses `min-h-[50vh]` (line 844) — a **minimum** height, not a fixed one. The `img` inside has `w-full h-full object-cover`, but because the parent only has a min-height (no explicit height), the actual rendered size depends on the image's intrinsic aspect ratio:

- **Landscape images** (like KIRA Santanyi beach): container stays at 50vh minimum, image covers it — smaller hero
- **Portrait/tall images** (like Janina Restaurant chandelier): image's natural height pushes the container beyond 50vh — larger hero

## Fix

Replace `min-h-[50vh]` with a fixed `h-[70vh]` so all images get the larger, immersive hero treatment consistently — matching the look you prefer (screenshot 2).

### File: `src/components/meetups/MeetupDetailsDrawer.tsx` (line 844)

```
// Before
isMobile ? "min-h-[50vh]" : "aspect-video"

// After
isMobile ? "h-[70vh]" : "aspect-video"
```

One line change. Desktop layout unchanged.

