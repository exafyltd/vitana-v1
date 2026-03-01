
Goal: restore your real uploaded media visibility on both desktop and mobile, and keep delete confirmation behavior.

What I verified (from your actual DB)
- `profile_gallery`: 4 images for your user (`user_id = 0adc6ff6-acb0-4dca-99d0-295211a40e3e`)
- `media_uploads`: 4 videos for the same user
- So your media is not deleted; it exists in database.

Root cause
- Media queries are using the wrong identifier in key places:
  - `ProfileSplitNavigation.tsx` uses `useProfileGallery(profile.id)` and `VideoGallery userId={profile.id}`
  - `ProfileLayout.tsx` uses `useProfileGallery(profile.id)` / `useProfileMilestones(profile.id)`
- On `/me/profile`, `EditProfilePage` initializes `profile.id` as `"current-user"` (not auth `user.id`), so desktop queries run with wrong `user_id` and return empty.
- In other flows, `profile.id` can be profile-row ID (not auth user ID), same visibility failure pattern.

Implementation plan
1) Normalize user id resolution for all profile media queries
- In `ProfileSplitNavigation.tsx` and `ProfileLayout.tsx`, create one resolved id:
  - `const profileUserId = profile.user_id || profile.id`
- Use `profileUserId` everywhere media/milestones are queried:
  - `useProfileGallery(profileUserId)`
  - `useProfileMilestones(profileUserId)`
  - `<VideoGallery userId={profileUserId} />`

2) Fix `/me/profile` profile identity source
- In `EditProfilePage.tsx`, ensure `profile.id` is set to authenticated `user.id` once available (not `"current-user"` placeholder long-term).
- Keep `profile.user_id = user.id` in sync after `refetchProfile`.
- This prevents downstream components from querying with invalid IDs.

3) Prevent “blank media tab” confusion
- In desktop media tab container, add a unified empty-state block when both:
  - `photos.length === 0`
  - `videos.length === 0`
- This makes UI explicit instead of appearing “removed”.

4) Keep current delete UX (already correct)
- Preserve current trash flow:
  - trash icon -> confirmation popup -> delete on confirm
- No rollback needed there; just ensure it still works after id-fix.

Technical details
- No DB migration needed.
- No RLS policy change needed (policies already allow owner reads and your rows exist).
- This is a client-side identity wiring bug, not data loss.
- Do not edit `src/integrations/supabase/types.ts`.

Validation checklist (must pass)
- Desktop `/me/profile` Media tab shows exactly:
  - 4 photos
  - 4 videos
- Mobile profile Media shows same content.
- Videos are playable (tap/click toggles play/pause).
- Trash icon opens confirmation dialog; Cancel keeps item; Confirm removes item and refreshes list.
- Network requests use `user_id=eq.0adc6ff6-acb0-4dca-99d0-295211a40e3e` (not `current-user`, not profile row UUID).
