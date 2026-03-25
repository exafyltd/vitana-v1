

## Fix: Event OG Images Not Showing on WhatsApp

### Root Cause

The `og-event` edge function is **not deployed**. Calling it returns a 404:

```text
supabase-edge-functions http error: status code 404
{"code":"NOT_FOUND","message":"Requested function was not found"}
```

The Cloudflare Worker at `e.vitanaland.com` proxies crawler requests to this edge function. Since the function doesn't exist on the server, WhatsApp's crawler gets no OG metadata, so no image preview appears.

The code in `supabase/functions/og-event/index.ts` is correct and complete — it just needs to be deployed.

### Fix

**Deploy the `og-event` edge function.** One action, no code changes needed.

After deployment, verify by curling the function with a WhatsApp user-agent to confirm it returns HTML with the correct `og:image` meta tag for the "Maxina Experience by Janina Restaurant" event.

Note: WhatsApp caches link previews aggressively. After deploying, sharing the link again should show the image. For already-cached links, WhatsApp may take hours to refresh the preview.

### Files
- No code changes needed
- Deploy: `supabase/functions/og-event/index.ts`

