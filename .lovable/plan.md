

# Fix stale event image on mobile (browser cache issue)

## Problem
Desktop and mobile both use the exact same data (`event.image_url`) from the same database query and identical transform logic. The old image persists on mobile because the **mobile browser has cached the previous image** at that URL. Since Supabase storage URLs don't change when you replace a file at the same path, mobile continues serving the cached version.

## Solution
Add a cache-busting query parameter to Supabase storage image URLs in both the desktop and mobile `sanitizeUrl` functions. This forces the browser to re-fetch the image.

## Changes

### 1. `src/pages/community/EventsAndMeetups.tsx` — update `sanitizeUrl` (line ~75-78)

After validating the URL, append a cache-busting param based on the current date (changes daily) for Supabase storage URLs:

```typescript
if (isHttp || isAsset || isSupabaseStorage || isDataImage || isBlob) {
  // Cache-bust Supabase storage URLs to pick up replaced images
  if (isSupabaseStorage && !s.includes('_cb=')) {
    const cb = new Date().toISOString().slice(0, 10); // daily cache bust
    return s + (s.includes('?') ? '&' : '?') + '_cb=' + cb;
  }
  return s;
}
```

### 2. `src/components/community/MobileEventCarousel.tsx` — same change to its `sanitizeUrl` (line ~35-37)

Apply the identical cache-busting logic to the mobile version's `sanitizeUrl`.

### Files changed
- `src/pages/community/EventsAndMeetups.tsx`
- `src/components/community/MobileEventCarousel.tsx`

