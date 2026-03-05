

# Why WhatsApp Previews Show No Image — Diagnosis

## Root Cause: Cloudflare Worker is NOT serving OG tags

I fetched `https://vitanaland.com/e/selbsterfahrung` and the response is **the raw SPA HTML with no OG meta tags in the `<head>`**. The page has no `<meta property="og:image">`, no `<meta property="og:title">`, nothing. WhatsApp's crawler gets this HTML, finds no OG tags, and shows a blank preview.

**Both edge functions work perfectly** — I verified:
- `api-event-by-slug?slug=selbsterfahrung` → returns correct JSON with title, image, description
- `og-event?slug=selbsterfahrung` (with WhatsApp UA) → returns correct OG HTML with all meta tags

The problem is that **the Cloudflare Worker at `vitanaland.com/e/*` is not intercepting crawler requests**. It's passing all traffic (including WhatsApp's bot) straight to the SPA, which renders client-side with no server-side OG tags.

## What Needs to Be Fixed (Outside Lovable)

This is a **Cloudflare Worker configuration issue**, not a code issue in this repo. You need to verify/fix in your Cloudflare dashboard:

### 1. Check the Worker Route
In Cloudflare dashboard → Workers Routes, confirm a route like `vitanaland.com/e/*` is bound to your `vitanaland-og-proxy` worker.

### 2. Verify the Worker Code
The worker should:
```
1. Check User-Agent for crawlers (WhatsApp, facebookexternalhit, etc.)
2. If crawler → fetch og-event edge function → return that HTML with Content-Type: text/html
3. If human → redirect to SPA (vitanaland.com/?share=event&slug=...)
```

### 3. Minimal Cloudflare Worker Example
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

### 4. Additional Check: Image Accessibility
The cover image for "Selbsterfahrung" appears to be a PNG with a white/transparent background — it loaded as a blank white screenshot. Verify the actual image file exists and has visible content. WhatsApp also prefers **JPEG images under 300KB** for reliable previews.

## Summary
- Edge functions: Working correctly, no code changes needed
- Problem: Cloudflare Worker route/code at `vitanaland.com/e/*` — needs to be deployed or fixed in the Cloudflare dashboard
- Secondary: Verify cover images are visible JPEGs, not transparent PNGs

