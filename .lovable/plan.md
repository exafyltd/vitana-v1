

## Fix QR Code Not Working for Some Profiles

### Root Cause

The QR code URL is built as `/u/${profile.handle}`. When a profile has no handle set in the database, the fallback is `'user'` (EditProfilePage line 66) or `''` (PublicProfilePage line 111), producing invalid URLs like `/u/user` or `/u/`. The `get_user_profile_by_identifier` RPC supports both handle AND user_id lookup, so using the user_id as fallback produces a valid, resolvable URL.

Additionally, the QR download function uses `btoa(svgData)` which crashes on non-ASCII characters (e.g., accented names like "Tadić" in avatar fallback text embedded in SVG).

### Changes

**1. `src/pages/EditProfilePage.tsx`** (line 66)
- Change handle fallback from `'user'` to `user?.id || 'user'`
- Same on line 151 where handle is re-derived after save

**2. `src/components/profile/shared/ShareProfileModal.tsx`** (line 69)
- Change `profileUrl` to use `profile.id` (user_id) when `profile.handle` is empty/falsy:
  `const profileUrl = \`\${window.location.origin}/u/\${profile.handle || profile.id}\`;`

**3. `src/components/profile/shared/ShareProfileModal.tsx`** (line 107)
- Fix `btoa(svgData)` to handle non-ASCII: use `btoa(unescape(encodeURIComponent(svgData)))` (same pattern already used in `MobileQRShareScreen.tsx`)

**4. `src/hooks/useProfileShare.ts`** (line 21)
- The `getShareUrl` builds URL from `handle` param. Add a fallback: accept an optional `profileId` as the identifier fallback if handle is empty.
- Change URL path: `const profilePath = \`/u/\${handle || profileId}\`;`

**5. `src/components/profile/shared/ProfileIdCardFront.tsx`**
- Ensure the share hook receives the user_id-based handle fallback consistently

**6. `src/components/profile/shared/ProfileLayout.tsx`**
- Same: ensure handle fallback to `profile.id` for share hook

This ensures every profile gets a working QR code URL regardless of whether a custom handle has been set.

