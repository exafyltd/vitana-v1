

# Fix Invite Friends + Social Connect Pages

## Problem
Both pages call non-existent community gateway endpoints that always fail:
- `InviteFriends.tsx` calls `communityFetch('/api/v1/social-accounts/connections')` and `communityFetch('/api/v1/automations/execute/AP-1303')`
- `SocialConnect.tsx` calls `communityFetch('/api/v1/social-accounts/providers')`, `/connections`, `/connect/`, `/disconnect/`

None of these endpoints return useful data.

## Fix 1: Rebuild `src/pages/InviteFriends.tsx`

### Remove
- The entire "Connected Accounts / Import from Social" card (lines 266-298) — no backend supports social contact import
- The `communityFetch` import and all gateway calls
- The `handleImportSocial` function
- The `importingSocial` state

### Replace phone import
- Use `importFromPhonebook()` from `useContactSync` hook instead of raw Contact Picker API call
- After importing, use `addContact()` from `useContacts` to persist each contact to the `contacts` table

### Replace CSV import
- Keep the existing CSV parser logic
- After parsing, save each contact via `addContact()` from `useContacts` so they persist in Supabase

### Replace bulk invite send
- Remove the `communityFetch('/api/v1/automations/execute/AP-1303')` call
- Use `inviteContact()` from `useContacts` for each selected contact (it updates `invite_sent_at` in the contacts table)
- Note: `contact-bulk-invite` edge function does NOT exist, so we use the existing per-contact invite mechanism

### Import cards layout
- Two cards only: **Phone Contacts** (mobile) and **Upload CSV** (always available)
- Manual add collapsible section stays as-is

## Fix 2: Rebuild `src/pages/settings/SocialConnect.tsx`

### Remove
- ALL `communityFetch` calls and gateway imports
- The `Provider`/`Connection` interfaces
- The OAuth callback `useEffect`
- The TanStack queries for providers/connections

### Replace with
- Import `useSocialPlatforms` from `@/hooks/useSocialPlatforms` — provides all 6 platforms with connection status based on profile URLs
- Import `SocialMediaImportDialog` from `@/components/profile/dialogs/SocialMediaImportDialog`
- Import `useAuth` for `user.id` (needed as `profileId` prop)

### New UI
- List all 6 platforms from `useSocialPlatforms().allPlatforms`
- Each platform card shows:
  - Platform icon + name
  - Status badge: "Connected" (green) if `platform.connected` (URL exists in profile), or "Not connected"
  - If connected: show the saved URL, plus a "Reconnect" button to re-import
  - If not connected: show a "Connect" button
- Clicking Connect/Reconnect opens `SocialMediaImportDialog` with the selected platform
- On success, call `refreshProfile()` from `useProfile` to update connection status

### Result
- Page loads instantly (no failing network calls)
- Shows real connection status from the user's profile
- Users paste their social URL → edge function `social-media-import` enriches their profile with AI

## Files Changed
1. `src/pages/InviteFriends.tsx` — full rewrite of import methods and send logic
2. `src/pages/settings/SocialConnect.tsx` — full rewrite to use existing hooks/components

