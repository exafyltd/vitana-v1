

## Problem

The Cloudflare Worker at `e.vitanaland.com` is redirecting `/pub/events/{id}` to `vitanaland.com/e/pub%2Fevents%2F{id}` -- it URL-encodes the slashes, treating the entire path as a single slug segment. The app's `/e/:slug` route then tries to look up `pub%2Fevents%2F118cc9a8-...` as an event slug, which fails with "Event Not Found."

The actual URL in the screenshot: `https://vitanaland.com/e/pub%2Fevents%2F118cc9a8-1141-43e2-b9d3-be20c92cd66f`

## Fix

**File: `src/pages/PublicEventLanding.tsx`** (lines 51-55)

Add slug sanitization logic right after extracting the identifier. If the slug contains an encoded or literal `pub/events/` prefix, strip it and extract the UUID:

```typescript
const { slug, id } = useParams<{ slug?: string; id?: string }>();

// Handle malformed redirects where "/pub/events/{id}" gets encoded as a single slug
let identifier = slug || id;
if (identifier) {
  const decoded = decodeURIComponent(identifier);
  const pubEventsMatch = decoded.match(/^pub\/events\/(.+)$/);
  if (pubEventsMatch) {
    identifier = pubEventsMatch[1];
  }
}
```

This is a defensive fix on the frontend. The Cloudflare Worker redirect logic should also be corrected separately to preserve the path structure, but this ensures existing shared links (already in chat history) work immediately.

