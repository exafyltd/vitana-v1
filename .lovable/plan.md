

## Diagnosis

I verified:
- **Edge function** (`og-event`): Returns HTTP 200 with correct HTML
- **Direct image** (`/object/public/covers/...`): Accessible, returns valid JPEG
- **Transformed image** (`/render/image/public/covers/...`): Also accessible
- **Cloudflare Worker**: Route `vitanaland.com/e/*` is active and correctly redirects non-crawlers to the SPA

**Root cause**: The `og-event` function generates `og:image` URLs using Supabase Image Transformations (`/render/image/public/...?width=1200&height=630&resize=cover&quality=75`). WhatsApp's crawler likely cannot follow the redirect chain or does not accept the response from the transformation endpoint. Per project architecture notes: *"OG images use direct public storage URLs without transformation parameters"*.

## Fix

**Single change** in `supabase/functions/og-event/index.ts`:

Replace the `getOptimizedImageUrl` function to return the direct public storage URL (`/object/public/`) without any transformation parameters. Strip query strings and return the raw image URL as-is.

This eliminates the redirect chain WhatsApp encounters when trying to fetch a `/render/image/` URL.

After updating, the edge function will need to be redeployed to the live project:
```bash
supabase functions deploy og-event --no-verify-jwt --project-ref inmkhvwdcuyhnxkgfvsb
```

