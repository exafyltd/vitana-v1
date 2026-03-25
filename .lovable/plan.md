

## Diagnosis: WhatsApp Image Preview Not Working

### Root Cause: e.vitanaland.com is DOWN

The shared event URLs (e.g., `https://e.vitanaland.com/events/maxina-experience-by-janina-restaurant-3`) return a **Cloudflare DNS error (Error 1016)** — "Cloudflare is currently unable to resolve your requested domain." The Cloudflare Worker that proxies crawler requests to the `og-event` edge function is not reachable.

This means WhatsApp's crawler never reaches your OG metadata at all. The title showing in WhatsApp previews may be cached from a previous working state.

### Secondary Issue: Content-Type text/plain

Even when calling the `og-event` edge function directly, Supabase returns `Content-Type: text/plain` instead of `text/html`. This is a **known Supabase bug** affecting non-custom domains — the edge runtime overrides the Content-Type header regardless of what the code sets. The `new Headers()` approach does not fix it.

### What Needs to Happen (Infrastructure, not code)

1. **Fix e.vitanaland.com DNS/Cloudflare Worker** — The Cloudflare Worker needs to be re-deployed or the DNS records corrected so the domain resolves properly. This is done in the Cloudflare dashboard, not in this codebase.

2. **Fix Content-Type in Cloudflare Worker** — Since Supabase edge functions always return `text/plain`, the Cloudflare Worker should explicitly override the `Content-Type` to `text/html; charset=utf-8` when proxying the og-event response back to crawlers. Add this in the Worker code:
   ```javascript
   // After fetching from og-event edge function:
   const response = await fetch(edgeFunctionUrl);
   const html = await response.text();
   return new Response(html, {
     headers: {
       'Content-Type': 'text/html; charset=utf-8',
       'X-Content-Type-Options': 'nosniff',
       'Cache-Control': 'public, max-age=120',
     }
   });
   ```

3. **Image URL is correct** — The `og-event` function generates proper OG tags with a 1200x630 transformed image URL. No code changes needed in this repo.

### Summary

No code changes in this project will fix the issue. The fix is:
- Restore `e.vitanaland.com` Cloudflare Worker (DNS/deployment issue)
- Have the Worker set `Content-Type: text/html` on its response to crawlers

### Action Required

You need to check your **Cloudflare dashboard** for the `vitanaland.com` zone and verify:
- The `e` subdomain DNS record exists and points to a Worker route
- The Worker is deployed and active
- The Worker route pattern matches `e.vitanaland.com/*`

