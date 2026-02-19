

## Fix "COMMUNITY" Flash in Top App Bar

### Problem
When logging into the Maxina app, the Top App Bar briefly shows "COMMUNITY" for 1-2 seconds before switching to "MAXINA". This happens because tenant data is loaded asynchronously from the database, and the fallback text is hardcoded as `'Community'`.

### Root Cause
In `TopAppBar.tsx` (line 15) and `SideDrawerNav.tsx` (line 22):
```
const tenantName = tenant?.name || 'Community';
```
While the tenant query is in flight, `tenant` is null, so the fallback "Community" is displayed.

### Solution
Use the URL path to determine the tenant name immediately (synchronously) instead of waiting for the database query. The tenant slug is already in the URL (e.g., `/maxina/...`, `/comm/...`), so we can derive a display name from it instantly.

### Changes

**File: `src/components/mobile/TopAppBar.tsx`**
- Read the tenant name from the URL path as an immediate fallback instead of the generic "Community"
- Logic: if path starts with `/maxina` or user is on `/comm` routes and localStorage has `tenant_slug`, use that slug to look up the name
- Simpler approach: just use `tenant?.name || ''` (empty string) so nothing shows while loading, avoiding the incorrect "COMMUNITY" label entirely. The bar still renders, just without text for a brief moment.

**File: `src/components/mobile/SideDrawerNav.tsx`**
- Same fix: replace the `'Community'` fallback with `''` or a URL-derived name

### Recommended Approach
The simplest and cleanest fix: change the fallback from `'Community'` to an empty string `''`. This means for 1-2 seconds the bar appears without a title (which is far less jarring than showing the wrong brand name), then the correct name appears.

Alternatively, we can read `localStorage.getItem('tenant_slug')` (which is already persisted on tenant switch) and map it to a display name for an instant, synchronous fallback -- giving us the correct name from the very first render.

