

## Investigation: Event Sharing Broken

### Root Cause
The `e.vitanaland.com` subdomain has a **broken SSL certificate** (`ERR_SSL_VERSION_OR_CIPHER_MISMATCH`). Every shared event link, profile link, and match link currently points to this dead subdomain. This is an infrastructure issue (Cloudflare/DNS), not a code bug.

### Impact
- All event share links are unreachable (WhatsApp, copy link, email, etc.)
- No OG image previews (the Cloudflare Worker that serves them is on `e.vitanaland.com`)
- Profile share links broken
- Match share links broken
- AI chat event links broken

### Recommended Fix: Switch to `vitanaland.com` with share parameters

Since `vitanaland.com` works and `ShareEntry.tsx` already handles `?share=event&slug=...` routing, we can reroute all share URLs through the main domain. This restores link functionality immediately while the SSL issue is resolved separately.

#### Files to edit

**1. `src/lib/shareUrl.ts`**
- Change `canonicalBase` from `https://e.vitanaland.com` to `https://vitanaland.com`
- Events: generate `https://vitanaland.com/?share=event&slug={slug}` (or `&id={id}` fallback)
- Profiles: generate `https://vitanaland.com/?share=profile&id={id}`
- `getCleanEventUrl`: same pattern change

**2. `src/hooks/useProfileShare.ts`**
- Change canonical base from `https://e.vitanaland.com` to `https://vitanaland.com`
- Use `?share=profile&id={id}` pattern

**3. `src/pages/ShareEntry.tsx`**
- Add handler for `share=profile` type (redirect to `/profile/{id}`)

**4. `supabase/functions/ai-chat/index.ts`**
- Update hardcoded `https://e.vitanaland.com/events/...` URLs to use `https://vitanaland.com/?share=event&slug=...` pattern
- Update match links similarly

### What this does NOT fix
- OG image previews for social media crawlers — these require the Cloudflare Worker to be operational. The Worker needs its SSL certificate fixed on Cloudflare's dashboard. This is an external infrastructure task, not a code change.

### Trade-off
Once the `e.vitanaland.com` SSL is fixed, you can switch back to the subdomain URLs for cleaner links and OG preview support. The `?share=` pattern works as a reliable fallback.

### Technical note
The `DOMAIN_TENANT_MAP` entry for `e.vitanaland.com` can remain — it will work correctly once SSL is restored.

