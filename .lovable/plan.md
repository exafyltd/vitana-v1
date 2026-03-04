

## Diagnosis: Why WhatsApp Shows Generic Preview

The entire backend pipeline works correctly:
- `api-event-by-slug` edge function returns correct event data (title, image, description) -- verified
- `og-event` edge function generates proper OG HTML for crawlers -- verified  
- The edge functions are now deployed and responding

**The problem is the Cloudflare Worker (`vitanaland-og-proxy`)**. It's routed on `vitanaland.com/e/*` but is NOT proxying requests to the `og-event` edge function. Instead, it's serving the SPA's `index.html` to all visitors (including WhatsApp's crawler), which contains only the generic default OG tags:

```
og:title = "VITANA - Longevity Community"
og:description = "Discover events and connect with the longevity community"
```

This is exactly what your WhatsApp screenshot shows.

## Fix: Update Cloudflare Worker Code

The worker needs to be updated in the **Cloudflare dashboard** (Edit code button on the `vitanaland-og-proxy` worker). Here is the correct worker code:

```javascript
const SUPABASE_FUNCTION_URL = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/og-event';

const CRAWLERS = [
  'WhatsApp', 'facebookexternalhit', 'Facebot', 'Twitterbot',
  'LinkedInBot', 'Slackbot', 'TelegramBot', 'SkypeUriPreview',
  'Discordbot', 'redditbot', 'vkShare', 'W3C_Validator',
  'Embedly', 'Quora Link Preview',
];

function isCrawler(ua) {
  return CRAWLERS.some(c => ua.includes(c));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ua = request.headers.get('user-agent') || '';

    // Extract slug from /e/{slug}
    const match = url.pathname.match(/^\/e\/(.+)$/);
    if (!match) {
      // Not an event URL — pass through to origin
      return fetch(request);
    }

    const slug = decodeURIComponent(match[1]);

    if (isCrawler(ua)) {
      // Crawler: fetch OG HTML from Supabase edge function
      const ogUrl = `${SUPABASE_FUNCTION_URL}?slug=${encodeURIComponent(slug)}`;
      const ogResponse = await fetch(ogUrl, {
        headers: { 'User-Agent': ua },
      });

      if (ogResponse.ok) {
        const html = await ogResponse.text();
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    // Human visitor: redirect to SPA with share params
    const spaUrl = `https://vitanaland.com/?share=event&slug=${encodeURIComponent(slug)}`;
    return Response.redirect(spaUrl, 302);
  },
};
```

## Steps (all in Cloudflare dashboard, no code changes needed in Lovable)

1. Go to **Workers & Pages > vitanaland-og-proxy > Edit code**
2. Replace the worker code with the script above
3. Click **Deploy**
4. Test by sharing `https://vitanaland.com/e/zugspitze-hikers-reunion-trail-friends` in WhatsApp again

The worker will now forward crawlers to the `og-event` edge function (which returns event-specific OG HTML with the correct title, image, and description), and redirect human visitors to the SPA.

