

## Root Cause Analysis

Two issues are breaking OG image previews:

### Issue 1: Invalid `format=jpeg` parameter (PRIMARY CAUSE)
Both edge functions (`og-event` and `api-event-by-slug`) append `?width=1200&format=jpeg` to Supabase render URLs. However, **Supabase's image transform API does not accept `format=jpeg`** — it returns a 400 error:
```
{"statusCode":"400","error":"Error","message":"querystring/format must be equal to one of the allowed values"}
```

This means every `og:image` URL served to WhatsApp/social crawlers is a **broken 400 error page**, not an image.

**Proof**: Without the format param, the image loads perfectly at:
`/storage/v1/render/image/public/covers/.../file.webp?width=1200` (works)
vs.
`/storage/v1/render/image/public/covers/.../file.webp?width=1200&format=jpeg` (400 error)

### Issue 2: Empty default-images bucket (SECONDARY)
The fallback image `default-images/vitana-og-default.jpg` doesn't exist — the bucket is empty. Events without images would get a broken fallback.

---

## Fix Plan

### 1. Fix image URL generation in `og-event/index.ts`
- In `getOptimizedImageUrl()`: Remove `&format=jpeg`, keep only `?width=1200`
- For WebP source files, use the **direct `/object/public/` URL** instead of `/render/image/` (WhatsApp handles WebP fine now; the render endpoint without format param returns the original format anyway)
- Simplest fix: just use the original `/object/public/` URL with no transformation — these are already publicly accessible and social crawlers can handle them

### 2. Fix image URL generation in `api-event-by-slug/index.ts`
- Same change in `getOgImageUrl()`: remove the invalid `format=jpeg` parameter

### 3. Fix fallback image URL
- Change the default fallback in both functions to use an image that actually exists. Options:
  - Use a direct URL from the `covers` bucket (an existing image)
  - Or simply point to the raw `/object/public/` path without render transforms

**Recommended approach**: Stop using `/render/image/` entirely. Use the direct `/object/public/` URLs as-is. WhatsApp, Facebook, Twitter, and all major crawlers support WebP, PNG, and JPEG natively. The render endpoint adds complexity and breakage for zero benefit.

### Files to update
| File | Change |
|------|--------|
| `supabase/functions/og-event/index.ts` | Remove `/render/image/` transform; use direct `/object/public/` URLs |
| `supabase/functions/api-event-by-slug/index.ts` | Same fix |

### For the default fallback image
You'll need to upload a `vitana-og-default.jpg` file to the `default-images` bucket in Supabase Storage, or change the fallback URL to point to an existing image.

