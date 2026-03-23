

## Fix: Media/Shorts Black Screen on iPad Air (Appilix WebView)

### Problem
Videos render as black/blank screens on iPad Air 11-inch in Appilix WebView. The `<video>` element lacks iPad-specific attributes and has no fallback for load failure, autoplay blocking, or network stalls.

### Changes

**File 1: `src/components/community/MobileShortSlide.tsx`** — Full rewrite of video handling

1. Add a `VideoState` type: `'loading' | 'ready' | 'playing' | 'paused' | 'autoplay-blocked' | 'stalled' | 'error'`
2. Add `webkit-playsinline=""` and `crossOrigin="anonymous"` to `<video>`
3. Add event handlers: `onCanPlay`, `onLoadedData`, `onPlaying`, `onPause`, `onWaiting`, `onStalled`, `onError`
4. Add stall timer (5s) — if `onWaiting`/`onStalled` fires and doesn't resolve, set state to `'stalled'`
5. Add three overlay states:
   - **Loading**: Spinner overlay when `videoState === 'loading'` and slide is active
   - **Autoplay blocked**: Large centered Play button (tappable) when `videoState === 'autoplay-blocked'`; manual play handler tries unmuted first, falls back to muted
   - **Error/Stalled**: RotateCcw retry button + text label ("Failed to load — tap to retry" / "Buffering — tap to retry")
6. Show thumbnail `<img>` behind the video during loading, error, and autoplay-blocked states so the user never sees pure black
7. Import `Loader2`, `RotateCcw` from lucide-react
8. All overlays use proper z-index layering (thumbnail z-1, video z-2, gradient z-3, interactive overlays z-20)

**File 2: `src/components/community/VideoPlayerModal.tsx`** — Add iPad compatibility + error handling

1. Add `webkit-playsinline=""` and `crossOrigin="anonymous"` to `<video>` element (line 302-314)
2. Add `videoState` state with same type as above
3. Add `onError`, `onWaiting`, `onStalled`, `onCanPlay`, `onLoadedData` handlers
4. When error/stalled: show thumbnail as `<img>` behind video + retry button overlay
5. When autoplay blocked (existing `.catch()` in `handleVideoPlay`): set state to `'autoplay-blocked'` — the existing center play button already handles this but ensure it stays visible
6. Add loading spinner when `videoState === 'loading'`

### Key technical details

**iPad WebView attributes:**
```tsx
<video
  playsInline
  webkit-playsinline=""  // legacy WebKit for iPad WebView
  crossOrigin="anonymous"  // CORS for Supabase storage
  preload={isActive ? "auto" : "metadata"}
  onCanPlay={() => setVideoState('ready')}
  onLoadedData={() => { /* clear stall */ }}
  onPlaying={() => { setVideoState('playing'); clearStallTimer(); }}
  onWaiting={() => { startStallTimer(5000); }}
  onStalled={() => { startStallTimer(5000); }}
  onError={() => setVideoState('error')}
/>
```

**Manual play handler (autoplay-blocked recovery):**
```tsx
// Try with current mute state first
video.play().catch(() => {
  // Fall back to muted playback (iPad often requires muted autoplay)
  video.muted = true;
  video.play().catch(() => setVideoState('error'));
});
```

**Thumbnail fallback layer:**
```tsx
{thumbnailUrl && (showError || showAutoplay || showLoading) && (
  <img src={thumbnailUrl} className="absolute inset-0 w-full h-full object-cover z-[1]" />
)}
```

### Files to modify
- `src/components/community/MobileShortSlide.tsx`
- `src/components/community/VideoPlayerModal.tsx`

### Result
- No blank/black screens — thumbnail always visible as fallback
- Clear recovery actions: tap-to-play, tap-to-retry
- Proper iPad WebView compatibility via webkit-playsinline
- Video states clearly distinguished: loading → ready → playing/paused/blocked/stalled/error

