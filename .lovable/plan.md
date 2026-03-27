

## Revert Share URLs to `e.vitanaland.com` (Cloudflare SSL Fixed)

### Summary
Now that Cloudflare SSL is restored, revert all share URLs from the `vitanaland.com/?share=` workaround back to the original `e.vitanaland.com` pattern. This restores OG image previews for social media crawlers.

### Changes

#### 1. `src/lib/shareUrl.ts`
- **Events/meetups**: Change `canonicalBase` from `https://vitanaland.com` back to `https://e.vitanaland.com`
- Generate URLs as `https://e.vitanaland.com/events/{slug}` (or `/events/{id}` fallback) — clean paths, no query params
- Remove UTM params from shared event links (Cloudflare Worker doesn't need them; they break OG)
- **Profiles**: Change to `https://e.vitanaland.com/profiles/{id}`
- **`getCleanEventUrl`**: Same pattern — `https://e.vitanaland.com/events/{slug}`

#### 2. `src/hooks/useProfileShare.ts`
- Change `getShareUrl` to return `https://e.vitanaland.com/profiles/{profileId}`

#### 3. `supabase/functions/ai-chat/index.ts`
- Revert event links from `vitanaland.com/?share=event&slug=...` back to `e.vitanaland.com/events/{slug}`
- Revert match links from `vitanaland.com/?share=match&id=...` back to `e.vitanaland.com/matches/{id}`

#### 4. `src/pages/ShareEntry.tsx`
- Keep the `?share=profile` and `?share=event` handlers — they still work as fallbacks and cost nothing to keep

### Files
- **Edit**: `src/lib/shareUrl.ts`, `src/hooks/useProfileShare.ts`, `supabase/functions/ai-chat/index.ts`
- **No change**: `ShareEntry.tsx` (keep fallback handlers), `domain-tenant-mapping.ts` (already has `e.vitanaland.com`)

