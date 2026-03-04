## Cloudflare Worker OG Handling — Implementation Complete

### Summary
Implemented server-side OG handling for premium WhatsApp/social previews via Cloudflare Worker architecture.

### What Was Done

#### 1. Database: Unique Slug Constraint + Auto-Generation
- Added `UNIQUE` partial index on `slug` column (WHERE slug IS NOT NULL)
- Created `generate_event_slug()` trigger function — auto-generates URL-safe slugs from titles with collision handling
- Trigger fires on INSERT/UPDATE of `global_community_events`

#### 2. New Edge Function: `api-event-by-slug`
- **Endpoint:** `GET /functions/v1/api-event-by-slug?slug=xyz`
- **Returns:** `{ title, short_description, image_url, event_id }`
- Uses `resolve_event_by_slug` RPC
- Forces non-WebP images (converts Supabase storage URLs to JPEG fallback)
- No auth required, cached 5min client / 10min CDN

#### 3. Updated `og-event` Edge Function
- Base URL changed from `vitana.exafy.io` → `vitanaland.com`
- Canonical URL: `https://vitanaland.com/e/{slug}`
- Image MIME type never returns `image/webp`
- WebP images auto-converted via Supabase render endpoint

#### 4. Share URLs — Canonical Only
- `getShareUrl('event', id, { slug })` → `https://vitanaland.com/e/{slug}` (NO UTM params)
- `getCleanEventUrl()` → same canonical base
- Updated all callers: `MobileEventCarousel`, `MeetupDetailsDrawer`, `EventsAndMeetups`

### Cloudflare Worker Integration
Your Cloudflare Worker at `vitanaland.com/e/*` should:
1. Detect crawler via User-Agent
2. **Crawler:** `fetch('https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/api-event-by-slug?slug={slug}')` → build OG HTML
3. **Human:** Pass through to SPA (serve index.html)

### Files
| File | Action |
|------|--------|
| `supabase/functions/api-event-by-slug/index.ts` | Created |
| `supabase/functions/og-event/index.ts` | Updated — vitanaland.com base, no WebP |
| `supabase/config.toml` | Added `api-event-by-slug` |
| `src/lib/shareUrl.ts` | Canonical URLs, no UTMs for events |
| `src/components/community/MobileEventCarousel.tsx` | Simplified share URL |
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Simplified share URL |
| `src/pages/community/EventsAndMeetups.tsx` | Simplified share URL (2 locations) |
| Migration | Unique slug index + auto-slug trigger |
