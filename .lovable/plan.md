

## Fix OG Event Image + Sanitize + Cloudflare Worker Guidance

### Verified: og-event works correctly
Direct test confirms: `GET /functions/v1/og-event?slug=zugspitze-hikers-reunion-trail-friends` with `User-Agent: facebookexternalhit/1.1` returns correct OG HTML with event title, JPEG image URL, and canonical URL. **The edge function is working.**

### Root cause: Cloudflare Worker is not proxying crawler requests
Meta Sharing Debugger scrapes `vitanaland.com/e/{slug}` and gets the SPA's `index.html` (with generic "VITANA - Longevity Community" OG tags) instead of the og-event response. This means **your Cloudflare Worker is either not deployed or is serving the SPA fallback for all requests**.

### Changes needed

#### 1. Fix `og-event` — WebP→JPEG + sanitize curly quotes
**File:** `supabase/functions/og-event/index.ts`
- `getOptimizedImageUrl`: Change `format=origin` → `width=1200&format=jpeg` (forces actual transcoding)
- `sanitizeText`: Strip HTML tags, replace `\u201C`/`\u201D` (curly double quotes) and `\u2018`/`\u2019` (curly single quotes) with safe equivalents, strip newlines, escape `&`
- `ensureAbsoluteUrl`: Fix relative URLs to use Supabase storage base (not vitanaland.com)

#### 2. Fix `api-event-by-slug` — same WebP + sanitize fix
**File:** `supabase/functions/api-event-by-slug/index.ts`
- `getOgImageUrl`: Change `format=origin` → `width=1200&format=jpeg`
- `shortDescription`: Strip HTML, normalize curly quotes, trim newlines

#### 3. Cloudflare Worker — CRITICAL (your side)
Your Cloudflare Worker at `vitanaland.com/e/*` must proxy crawler requests to `og-event`. Here's the exact Worker code:

```text
// Cloudflare Worker for vitanaland.com/e/*
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Only handle /e/{slug} routes
    const match = url.pathname.match(/^\/e\/([^\/]+)$/);
    if (!match) return fetch(request);
    
    const slug = match[1];
    const ua = request.headers.get('user-agent') || '';
    
    // Detect crawlers
    const isCrawler = /facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|redditbot/i.test(ua);
    
    if (isCrawler) {
      // Proxy to og-event edge function
      const ogUrl = `https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/og-event?slug=${encodeURIComponent(slug)}`;
      const ogResponse = await fetch(ogUrl, {
        headers: { 'User-Agent': ua }
      });
      
      // Return OG HTML with correct Content-Type
      const html = await ogResponse.text();
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        }
      });
    }
    
    // Human users: serve SPA (pass through to origin)
    return fetch(request);
  }
};
```

**Key point**: The Worker MUST explicitly set `Content-Type: text/html; charset=utf-8` on the proxied response, because Supabase edge functions may return `text/plain` which Facebook ignores.

### Files changed
| File | Change |
|------|--------|
| `supabase/functions/og-event/index.ts` | WebP→JPEG (`format=jpeg`), sanitize curly quotes + newlines, fix relative URLs |
| `supabase/functions/api-event-by-slug/index.ts` | WebP→JPEG, sanitize description |

### Acceptance verification
After deploying both edge functions AND updating the Cloudflare Worker:
1. Test: `https://developers.facebook.com/tools/debug/` with `https://vitanaland.com/e/zugspitze-hikers-reunion-trail-friends`
2. Expected: og:title = "Zugspitze Hikers Reunion – Trail Friends", og:image = .jpg URL, og:description clean
3. WhatsApp: Share the URL, preview should show event image + title

