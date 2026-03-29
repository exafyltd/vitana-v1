

# Fix "No Connected Accounts" False Negative on Invite Page

## Problem
The API call to `/api/v1/social-accounts/connections` returns `{"ok":true,"connections":[]}` even though the user has LinkedIn connected (with a URL in their profile). This is because the gateway tracks **OAuth-connected** accounts separately from profile URL links. The user sees "Connected" on the Connected Apps page (URL-based) but gets "No connected accounts" on the Invite page (OAuth-based) — a confusing contradiction.

## Solution
Two changes in `src/pages/InviteFriends.tsx`:

### 1. Improve the error message for empty connections
Instead of the generic "No connected accounts" toast, show a more specific message explaining that OAuth-level access is needed for contact import, and that profile URLs alone aren't sufficient:

```
toast.info("No social accounts with contact access. Connect accounts with OAuth in Settings → Social Accounts to import contacts.");
```

### 2. Add a fallback: use profile social URLs to suggest connections
Import `useProfile` from `@/context/ProfileProvider`. When the gateway returns empty connections but the user has social URLs in their profile, show a more helpful message like:

```
toast.info("Your linked accounts (LinkedIn, etc.) don't support contact import yet. Try CSV upload or add contacts manually.");
```

This avoids the false "no connected accounts" perception by acknowledging what they do have connected.

### 3. Add a "Go to Settings" link in the Connected Accounts card
Below the "Import from Social" button, add a small link: `"Manage connections →"` that navigates to `/settings/social`, so users can easily connect accounts with OAuth if they want to enable this feature.

## Files Changed
- `src/pages/InviteFriends.tsx` — update `handleImportSocial`, add profile check, add settings link

