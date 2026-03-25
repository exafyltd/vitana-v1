

## Investigation Results

### What's Working
- The `og-event` edge function is deployed and returns correct OG HTML with title, description, and image URL
- The image file exists in Supabase storage (526KB JPEG, accessible)
- WhatsApp IS reading the OG metadata (title "Maxina Experience by Janina Restaurant" appears in the preview)

### Root Cause: `Content-Type: text/plain` Response Header

The edge function code correctly sets `Content-Type: text/html; charset=utf-8`, but the actual response returns `Content-Type: text/plain` (confirmed via curl). This is a Supabase edge runtime behavior where the Content-Type header gets overridden.

WhatsApp's crawler can extract text-based OG tags (title, description) even from `text/plain`, but it does NOT follow `og:image` URLs from non-HTML responses. This matches the exact symptom: title shows, image doesn't.

### Fix

**File: `supabase/functions/og-event/index.ts`**

Use explicit `new Headers()` construction and set Content-Type first (before spread), ensuring it isn't silently overridden by the runtime. Also add `X-Content-Type-Options: nosniff` to prevent MIME type sniffing interference.

For the crawler response (line ~196):
```typescript
const headers = new Headers();
headers.set('Content-Type', 'text/html; charset=utf-8');
headers.set('Cache-Control', 'public, max-age=120, s-maxage=120');
headers.set('X-Content-Type-Options', 'nosniff');
headers.set('Access-Control-Allow-Origin', '*');

return new Response(generateOGHTML(event, canonicalUrl, destinationUrl), { headers });
```

Apply the same `new Headers()` pattern to the fallback HTML responses (lines ~149, ~178, ~211) for consistency.

After deploying, verify with curl that the response now shows `Content-Type: text/html`. Then share the link fresh in WhatsApp (cached previews won't update immediately).

### Technical Details
- 1 file changed: `supabase/functions/og-event/index.ts`
- Redeploy edge function after code change
- WhatsApp caches link previews aggressively; test with a fresh link share

