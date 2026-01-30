
## Fix: Stop Sharing Supabase Edge Function URLs Directly

### Problem Analysis

The current architecture shares the **Supabase edge function URL** directly:

```
https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/og-event?slug=...
```

This causes:
1. **Antivirus false positives** (Kaspersky HEUR:AdWare.Script.Generic)
2. **User distrust** - URLs look suspicious, not like a real website
3. **Broken experience** if the edge function fails or is slow

### Root Cause

In `src/lib/shareUrl.ts` (lines 31-47), the `getShareUrl()` function for events/meetups returns the edge function URL:

```typescript
if (type === 'event' || type === 'meetup') {
  // ...
  return `https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/og-event?${params.toString()}`;
}
```

This URL is then used everywhere events are shared:
- `UniversalShareDialog` (via `PersonalShareButtons`)
- `MeetupDetailsDrawer` 
- `EventsAndMeetups.tsx`
- `MobileEventCarousel.tsx`

### Correct Architecture

The solution requires separating **what users click** from **what crawlers see**:

```text
+------------------+       +-------------------+       +------------------+
|   User Shares    |       |  WhatsApp/Social  |       |   User Clicks    |
|  Link via App    |  -->  |  Crawler Fetches  |  -->  |  Link in Chat    |
+------------------+       +-------------------+       +------------------+
         |                         |                          |
         v                         v                          v
   Normal App URL           og-event returns            Normal App URL
   /e/my-event              OG HTML with meta           /e/my-event
                            tags pointing to            (static HTML, 200)
                            the image                   
```

**Key insight**: The edge function should **NOT** be the shared URL. It should only be used for:
1. Generating dynamic OG images (if needed in future)
2. Server-side OG meta tag injection (for hosts without SSR)

Since this app uses **client-side rendering (SPA)**, crawlers that fetch `/e/my-event` won't see the meta tags because they're injected by JavaScript after load.

### Solution Strategy

There are two possible approaches:

**Option A: Cloudflare Worker Proxy (Production)**
- Add a Cloudflare Worker on the custom domain that intercepts crawler requests
- Serve OG HTML for crawlers, pass-through for real users
- Requires domain/infrastructure changes

**Option B: Query Parameter Entry Point (Immediate Fix)**
- Share clean app URLs that go through `ShareEntry` component
- `ShareEntry` already exists and works correctly
- The SPA loads, injects meta tags client-side
- Works but meta tags may not be picked up by all crawlers

**Recommended: Hybrid Approach**
1. Share clean app URLs (`vitana.exafy.io/e/my-slug`)
2. Keep og-event for crawlers via a redirect pattern
3. Use ShareEntry's query param approach as fallback

### Implementation Plan

#### 1. Update `src/lib/shareUrl.ts` - Return App URLs Instead of Edge Function URLs

Change the event/meetup case to return normal app URLs:

```typescript
// Events/meetups use clean app URLs for sharing
// OG previews work via client-side meta tag injection
if (type === 'event' || type === 'meetup') {
  const appUrl = window.location.origin;
  
  // Build clean URL path
  const path = options?.slug 
    ? `/e/${encodeURIComponent(options.slug)}`
    : `/pub/events/${encodeURIComponent(id)}`;
  
  // Add UTM parameters
  const params = new URLSearchParams();
  if (options?.utm_source) params.set('utm_source', options.utm_source);
  if (options?.utm_medium) params.set('utm_medium', options.utm_medium);
  if (options?.utm_campaign) params.set('utm_campaign', options.utm_campaign);
  
  const queryString = params.toString();
  return `${appUrl}${path}${queryString ? '?' + queryString : ''}`;
}
```

#### 2. Ensure Event Pages Have Proper OG Meta Tags

The `PublicEventLanding.tsx` already uses the `SEO` component correctly:

```tsx
<SEO
  title={event.title}
  description={shortDescription}
  image={event.image_url}
  url={publicEventUrl}
  type="event"
/>
```

This injects OG meta tags client-side. For SPAs, this works when:
- The crawler supports JavaScript execution (WhatsApp does partially)
- The index.html has basic fallback meta tags

#### 3. Update `index.html` - Add Fallback OG Meta Tags

Add default OG meta tags that will be overwritten by the SEO component:

```html
<head>
  <!-- Default OG tags - overwritten by SEO component on specific pages -->
  <meta property="og:site_name" content="VITANA" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="VITANA - Longevity Community" />
  <meta property="og:description" content="Discover events and connect with the longevity community" />
  <meta property="og:image" content="https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/default-images/vitana-og-default.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
```

#### 4. Apply Same Fix to Campaigns

Update the campaign case in `shareUrl.ts` to also use app URLs.

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/shareUrl.ts` | Change event/meetup/campaign URLs from edge function to app URLs |
| `index.html` | Add fallback OG meta tags for crawlers that don't execute JS |

### Important Notes

**WhatsApp Preview Behavior:**
- WhatsApp's crawler partially executes JavaScript
- It may still show rich previews from client-side meta tags
- Testing is needed after implementation

**Alternative for Full Crawler Support:**
If client-side meta tags don't work well for all crawlers, a future enhancement would be:
1. Deploy the app with SSR (e.g., via Cloudflare Pages + Workers)
2. Or use Cloudflare Worker to serve OG HTML for crawlers only

**No Breaking Changes:**
- Existing shared links using `?share=event&slug=...` pattern still work
- The `ShareEntry` component handles the redirect correctly
- Users see clean URLs, no more Supabase function URLs

### Expected Results After Fix

| Before | After |
|--------|-------|
| `https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/og-event?slug=my-event` | `https://vitana.exafy.io/e/my-event` |
| Antivirus warnings | No warnings |
| Suspicious-looking URL | Clean, branded URL |
| Edge function dependency for every share | Direct app access |

### Technical Details

The key change is in `shareUrl.ts`:

```typescript
// BEFORE (problematic)
if (type === 'event' || type === 'meetup') {
  return `https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/og-event?...`;
}

// AFTER (correct)
if (type === 'event' || type === 'meetup') {
  const appUrl = window.location.origin;
  const path = options?.slug ? `/e/${options.slug}` : `/pub/events/${id}`;
  return `${appUrl}${path}${queryString}`;
}
```

This ensures:
1. Shared links are normal app URLs (HTTP 200, static HTML first paint)
2. No user ever opens `/functions/v1/og-event` directly
3. OG meta tags are injected client-side by the SEO component
4. WhatsApp preview should still work (needs testing)
