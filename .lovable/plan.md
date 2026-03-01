

## Problem

The desktop profile "Media" tab in `ProfileSplitNavigation.tsx` renders two things:
1. `PhotoGallery` -- queries real `profile_gallery` table (works correctly)
2. `ProfileMediaTab` -- **372 lines of 100% hardcoded mock data** with fake Unsplash images, fake creators, fake view counts, and a "Now Playing Dock" placeholder

Your real uploaded photos and videos are in the database (`profile_gallery` and `media_uploads` tables), but the desktop never shows them properly because `ProfileMediaTab` dominates the view with 8 fake cards. The `VideoGallery` component (which queries real data) is completely missing from the desktop media tab.

Additionally, both `PhotoGallery` and `VideoGallery` delete immediately on trash icon click with no confirmation dialog.

Mobile works because `ProfileLayout.tsx` uses `PhotoGallery` + `VideoGallery` directly (both query real DB).

---

## Plan (4 changes)

### 1. Rewrite `ProfileMediaTab.tsx` -- remove all mock data, query real DB

- Delete the entire `mockMedia` array (lines 24-129) and all fake creator data
- Delete the "Now Playing Dock" placeholder (lines 360-369)
- Import `useProfileGallery` hook and query `media_uploads` table (same pattern as `VideoGallery`)
- Render real photos as image cards, real videos as playable `<video>` elements with play/pause on click
- Keep the category filter dropdown (all/video/music/photos) wired to real `media_type` values
- Show proper empty state when no media exists
- Each item gets a trash icon (visible on hover for owner) that opens a confirmation AlertDialog before deleting

### 2. Add `VideoGallery` to desktop in `ProfileSplitNavigation.tsx`

- Import `VideoGallery`
- Add `<VideoGallery userId={profile.id} />` inside the media tab content (line 131), alongside `PhotoGallery` -- matching what mobile already does

### 3. Add delete confirmation dialog to `PhotoGallery.tsx` and `VideoGallery.tsx`

- Both components currently delete immediately on trash click with no confirmation
- Add an `AlertDialog` that asks "Are you sure you want to delete this?" before executing the delete
- Use the existing `AlertDialog` component from `@/components/ui/alert-dialog`
- Applies to both mobile and desktop (same components used everywhere)

### 4. Replace placeholders in `MobileMediaTabContent.tsx`

- Delete the `PLACEHOLDER_MEDIA` array (lines 20-57) with 6 fake Unsplash URLs
- Query real data from `profile_gallery` + `media_uploads` using `useProfileGallery` and a media_uploads query
- Or if this component is redundant (mobile already uses `PhotoGallery` + `VideoGallery` in `ProfileLayout.tsx`), remove usage and simplify

---

## Files to change

| File | What changes |
|------|-------------|
| `src/components/profile/shared/tabs/ProfileMediaTab.tsx` | Full rewrite: remove 8 mock items + Now Playing Dock, add real DB queries, playable videos, delete with confirmation |
| `src/components/profile/shared/ProfileSplitNavigation.tsx` | Add `VideoGallery` import and render in media tab |
| `src/components/profile/gallery/PhotoGallery.tsx` | Add AlertDialog confirmation before delete |
| `src/components/profile/gallery/VideoGallery.tsx` | Add AlertDialog confirmation before delete |
| `src/components/profile/mobile/MobileMediaTabContent.tsx` | Remove hardcoded placeholders, use real queries |

