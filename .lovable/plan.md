## WhatsApp OG Preview Fix — Cloudflare Worker Configuration

### Status: Requires Manual Action (Outside Lovable)

### Diagnosis
- ✅ `og-event` edge function — working, returns correct OG HTML
- ✅ `api-event-by-slug` edge function — working, returns correct JSON
- ❌ **Cloudflare Worker** at `vitanaland.com/e/*` is NOT intercepting crawler requests → SPA HTML served to WhatsApp bot → no OG tags → blank preview

### Fix: Deploy/Update Cloudflare Worker

In **Cloudflare Dashboard → Workers & Routes**:

1. **Create or update** worker `vitanaland-og-proxy` with this code:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const slug = url.pathname.replace('/e/', '');
    const ua = request.headers.get('user-agent') || '';
    
    const crawlers = ['WhatsApp', 'facebookexternalhit', 'Facebot', 
      'Twitterbot', 'LinkedInBot', 'Slackbot', 'TelegramBot', 'Discordbot'];
    const isCrawler = crawlers.some(c => ua.includes(c));
    
    if (isCrawler) {
      const ogResp = await fetch(
        `https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/og-event?slug=${encodeURIComponent(slug)}`,
        { headers: { 'User-Agent': ua } }
      );
      const html = await ogResp.text();
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    // Human → redirect to SPA
    return Response.redirect(
      `https://vitanaland.com/?share=event&slug=${encodeURIComponent(slug)}`, 302
    );
  }
};
```

2. **Bind route** `vitanaland.com/e/*` → `vitanaland-og-proxy` worker

3. **Verify** cover images are accessible JPEGs (not transparent PNGs) under 300KB

### Test After Fix
Share `https://vitanaland.com/e/selbsterfahrung` in WhatsApp — should show title, description, and image.
