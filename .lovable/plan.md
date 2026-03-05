

## Fix: Restore missing dark backdrop on ORB overlay

### What happened
During the previous edits to `VitanaAudioOverlay.tsx`, the dark frosted backdrop classes were removed from the overlay container at line 243. The line currently reads:

```
className="fixed inset-0 z-[100]"
```

It should be:

```
className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-2xl"
```

### What to change

**File: `src/components/audio/VitanaAudioOverlay.tsx` (line 243)**

Add `bg-black/85 backdrop-blur-2xl` back to the container's className. This is the only change needed — all other elements (ORB, mic controls, status text) are intact and rendering, just invisible against the bright page.

### Nothing else was damaged
- The ORB component (`VitanalandPortalSeed`) is still rendered at line 271
- Status text (`AudioStatusText`) is at line 280
- Audio controls are present further down
- The SSE/timeout fixes from the previous edit are functional improvements, not visual regressions

This is a one-line class restoration.

