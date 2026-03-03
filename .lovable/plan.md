

## Cloudflare Worker OG Handling — Implementation Plan

### Current State
- `global_community_events` already has a `slug` column, populated for all events
- `og-event` edge function exists and handles crawler detection + OG HTML generation
- Share URLs currently use `getShareUrl()` which appends UTM params — not clean
- `getCleanEventUrl()` exists but is unused
- `resolve_event_by_slug` RPC already works for slug-based lookups

### What Needs to Change

#### 1. New Edge Function: `api-event-by-slug`
Create `supabase/functions/api-event-by-slug/index.ts` — a simple JSON API endpoint:
- Route: invoked as `GET /api-event-by-slug?slug=xyz`
- Returns JSON: `{ title, short_description, image_url, event_id }`
- Uses `resolve_event_by_slug` RPC internally
- Ensures `image_url` is absolute and NOT WebP (if Supabase storage URL contains `.webp`, append `?format=jpg` or use fallback)
- No auth required (`verify_jwt = false`)
- Add to `config.toml`

#### 2. Ensure `share_slug` Uniqueness
- Add a database migration: `ALTER TABLE global_community_events ADD CONSTRAINT unique_slug UNIQUE (slug);`
- Add a trigger to auto-generate slug from title on INSERT if slug is null (using `lower(regexp_replace(title, '[^a-z0-9]+', '-', 'gi'))` with collision suffix)

#### 3. Update Share URLs — Use Canonical `vitanaland.com/e/{slug}` Only
- Modify `getShareUrl()` in `src/lib/shareUrl.ts`: when type is `event` or `meetup`, return `https://vitanaland.com/e/{slug}` with NO UTM params
- Update callers in `EventsAndMeetups.tsx`, `MeetupDetailsDrawer.tsx`, `MobileEventCarousel.tsx` to pass slug and stop passing UTM options for user-facing share links
- Keep UTM logic only for internal campaign tracking (not share buttons)

#### 4. Remove Generic OG Tags on Event Pages
- In `index.html` or any client-side SEO component, ensure event-specific pages (`/e/*`, `/pub/events/*`) do NOT inject generic site OG meta tags — the Cloudflare Worker will handle crawler meta exclusively

#### 5. Image URL — No WebP
- In the new API endpoint, if `image_url` contains `.webp`, convert to a JPEG/PNG URL (Supabase storage supports `?format=origin` or direct `.jpg` URLs)
- Update `og-event` edge function's `getOptimizedImageUrl` to reject WebP and return JPEG fallback

### Files Changed
| File | Action |
|------|--------|
| `supabase/functions/api-event-by-slug/index.ts` | Create — JSON API for Cloudflare Worker |
| `supabase/config.toml` | Add `[functions.api-event-by-slug]` with `verify_jwt = false` |
| `src/lib/shareUrl.ts` | Update `getShareUrl` for events to return canonical `vitanaland.com/e/{slug}` without UTMs |
| `supabase/functions/og-event/index.ts` | Update base URL to `vitanaland.com`, reject WebP images |
| Migration SQL | Add unique constraint on `slug`, add auto-slug trigger |
| `src/pages/PublicEventLanding.tsx` | Verify no generic OG injection on event routes |

### What You Handle (Cloudflare Side)
- Worker at `vitanaland.com/e/*` detects crawler vs human
- Crawler: fetch `https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/api-event-by-slug?slug={slug}`, return OG HTML
- Human: 302 redirect to `https://vitanaland.com/e/{slug}` SPA route (pass-through to app)

### Acceptance Criteria
- WhatsApp preview: event image (JPEG/PNG) + event title + short description
- URL appears as `vitanaland.com/e/sunday-in-nature` — no query params
- Every event has a unique slug
- Share button copies canonical URL only

