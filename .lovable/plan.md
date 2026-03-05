

# Rebrand Link Preview: VITANA → MAXINA

Replace all user-facing "VITANA" text in OG/SEO metadata across 3 files. File names like `vitana-og-default.jpg` stay unchanged (they're storage paths, not displayed text).

## Changes

### `index.html`
- Line 9: title → "VITANA Platform" (keep as-is per user)
- Line 10: description → "Join MAXINA to discover..."
- Line 11: author → "MAXINA"
- Line 14: og:site_name → "MAXINA"
- Line 15: og:title → "MAXINA - Longevity Community"
- Line 23: twitter:title → "MAXINA - Longevity Community"

### `src/components/SEO.tsx`
- Line 49: og:site_name → "MAXINA"

### `supabase/functions/og-event/index.ts`
- Line 79: `<title>` → "MAXINA - Discover Events"
- Line 81: og:site_name → "MAXINA"
- Line 82: og:title → "MAXINA - Discover Events"
- Line 83: og:description → "Join the MAXINA longevity community..."
- Line 92: body text → "Redirecting to MAXINA..."
- Line 107: fallback title → "MAXINA Event"
- Line 108: fallback description → "Join us for this event on MAXINA"
- Line 117: title suffix → "| MAXINA"
- Line 119: og:site_name → "MAXINA"

Edge function will need redeployment after edit.

